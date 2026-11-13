"""
module_subscribe.py  —  案例订阅 + 微信公众号定时推送
"""
import os, json, sqlite3, asyncio, random, httpx
from datetime import datetime, timedelta
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

router = APIRouter(prefix="/api", tags=["订阅推送"])

# ── 数据库 ────────────────────────────────────────────────
DB_PATH = "./subscribe.db"


def _init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                user_id         TEXT PRIMARY KEY,
                openid          TEXT DEFAULT '',
                email           TEXT DEFAULT '',
                serverchan_key  TEXT DEFAULT '',
                frequency       TEXT DEFAULT 'weekly',
                types           TEXT DEFAULT '[]',
                contents        TEXT DEFAULT '["case","tip","alert"]',
                identity        TEXT DEFAULT 'adult',
                age             TEXT DEFAULT '',
                active          INTEGER DEFAULT 1,
                created_at      TEXT,
                updated_at      TEXT,
                last_push       TEXT DEFAULT ''
            )
        """)
        # 自动迁移：给旧表加缺少的列
        existing = [row[1] for row in conn.execute("PRAGMA table_info(subscriptions)").fetchall()]
        migrations = {
            'serverchan_key': "ALTER TABLE subscriptions ADD COLUMN serverchan_key TEXT DEFAULT ''",
            'openid': "ALTER TABLE subscriptions ADD COLUMN openid TEXT DEFAULT ''",
            'last_push': "ALTER TABLE subscriptions ADD COLUMN last_push TEXT DEFAULT ''",
        }
        for col, sql in migrations.items():
            if col not in existing:
                conn.execute(sql)
                print(f"[Subscribe] 数据库迁移：新增列 {col}")
        conn.commit()


_init_db()


def _get_sub(user_id: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM subscriptions WHERE user_id=?", (user_id,)).fetchone()
        return dict(row) if row else None


def _save_sub(data: dict):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO subscriptions (user_id,openid,email,serverchan_key,frequency,types,contents,identity,age,active,created_at,updated_at)
            VALUES (:user_id,:openid,:email,:serverchan_key,:frequency,:types,:contents,:identity,:age,1,:now,:now)
            ON CONFLICT(user_id) DO UPDATE SET
                openid=excluded.openid, email=excluded.email,
                serverchan_key=excluded.serverchan_key,
                frequency=excluded.frequency, types=excluded.types,
                contents=excluded.contents, identity=excluded.identity,
                age=excluded.age, active=1, updated_at=excluded.updated_at
        """, {**data, 'now': now, 'types': json.dumps(data.get('types', [])),
              'contents': json.dumps(data.get('contents', [])),
              'serverchan_key': data.get('serverchan_key', '')})
        conn.commit()


# ── 微信推送 ──────────────────────────────────────────────
WX_APPID = os.environ.get("WX_APPID", "")
WX_APPSECRET = os.environ.get("WX_APPSECRET", "")
WX_TEMPLATE_ID = os.environ.get("WX_TEMPLATE_ID", "")  # 微信模板消息ID

_wx_token_cache = {"token": "", "expires": 0}


async def _get_wx_token() -> str:
    if _wx_token_cache["token"] and _wx_token_cache["expires"] > datetime.now().timestamp():
        return _wx_token_cache["token"]
    if not WX_APPID or not WX_APPSECRET:
        return ""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.weixin.qq.com/cgi-bin/token",
            params={"grant_type": "client_credential", "appid": WX_APPID, "secret": WX_APPSECRET},
            timeout=10
        )
        d = r.json()
        if "access_token" in d:
            _wx_token_cache["token"] = d["access_token"]
            _wx_token_cache["expires"] = datetime.now().timestamp() + d["expires_in"] - 300
            return d["access_token"]
    return ""


async def _send_serverchan(key: str, title: str, content: str) -> bool:
    """Server酱微信推送（更简单，不需要公众号）"""
    if not key or not key.startswith('SCT'):
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"https://sctapi.ftqq.com/{key}.send",
                data={"title": f"[反诈智能体] {title}", "desp": content},
                timeout=10
            )
            return r.json().get("data", {}).get("errno", -1) == 0
    except Exception as e:
        print(f"[Subscribe] Server酱推送失败: {e}")
        return False


async def _send_wx_template(openid: str, title: str, content: str, remark: str) -> bool:
    """发送微信模板消息"""
    token = await _get_wx_token()
    if not token or not openid or not WX_TEMPLATE_ID:
        return False
    payload = {
        "touser": openid,
        "template_id": WX_TEMPLATE_ID,
        "data": {
            "first": {"value": title, "color": "#ef4444"},
            "keyword1": {"value": content, "color": "#333333"},
            "keyword2": {"value": datetime.now().strftime("%Y-%m-%d %H:%M"), "color": "#999999"},
            "remark": {"value": remark, "color": "#3b82f6"},
        }
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.weixin.qq.com/cgi-bin/message/template/send",
            params={"access_token": token},
            json=payload, timeout=10
        )
        return r.json().get("errcode", -1) == 0


async def _send_email_push(email: str, title: str, content: str) -> bool:
    """邮件推送 —— 复用项目已有的QQ邮箱配置"""
    if not email:
        return False
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        # 优先从环境变量读，没有则用项目默认QQ邮箱
        SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.qq.com")
        SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
        SMTP_USER = os.environ.get("SMTP_USER", "")
        SMTP_PASS = os.environ.get("SMTP_PASS", "")
        if not SMTP_USER: return False
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[反诈智能体] {title}"
        msg["From"] = SMTP_USER
        msg["To"] = email
        html = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#ef4444">🛡️ 反诈智能体 · 案例推送</h2>
          <h3 style="color:#333">{title}</h3>
          <div style="background:#f8f8f8;padding:16px;border-radius:8px;border-left:4px solid #ef4444">
            {content.replace(chr(10), '<br>')}
          </div>
          <p style="color:#999;font-size:12px;margin-top:20px">遇到可疑内容，立即登录反诈智能体检测 · 反诈热线：96110</p>
        </div>"""
        msg.attach(MIMEText(html, "html", "utf-8"))
        loop = asyncio.get_event_loop()

        def _send():
            if SMTP_PORT == 465:
                with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as s:
                    s.login(SMTP_USER, SMTP_PASS)
                    s.sendmail(SMTP_USER, email, msg.as_string())
            else:
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
                    s.ehlo();
                    s.starttls();
                    s.ehlo()
                    s.login(SMTP_USER, SMTP_PASS)
                    s.sendmail(SMTP_USER, email, msg.as_string())

        await loop.run_in_executor(None, _send)
        return True
    except Exception as e:
        print(f"[Subscribe] 邮件发送失败: {e}")
        return False


# ── 推送内容生成 ──────────────────────────────────────────
CASE_POOL = {
    'police': [
        ("冒充公安局洗钱案",
         "【真实案例】骗子冒充'北京市公安局刑警大队'，声称您银行账户涉及跨境洗钱，要求将资产转入'安全账户'配合调查，并严禁告知家人。\n\n识别要点：\n• 公检法绝不会电话通知涉案\n• 没有'安全账户'这个概念\n• 要求保密是切断外部帮助的手段\n\n✅ 正确做法：立即挂断，拨打110核实"),
        ("冒充法院强制执行",
         "【真实案例】骗子发送伪造法院传票，称您卷入民事诉讼，需配合'资产核查'提供银行卡号和密码，实为盗取资金。\n\n识别要点：\n• 法院传票只通过邮政EMS送达\n• 任何要求银行密码的都是诈骗\n• '冻结核查'是骗局话术\n\n✅ 正确做法：登录中国裁判文书网核实，拨打法院官方电话"),
        ("冒充检察院办案",
         "【真实案例】骗子自称'最高人民检察院'工作人员，以受害者涉嫌'电信诈骗案'为由要求配合调查，要求转账至'安全账户'。\n\n⚠️ 任何自称公检法要求转账的，100%是诈骗！\n\n✅ 正确做法：挂断后拨打12309（检察院热线）核实"),
        ("冒充警方发通缉令",
         "【真实案例】骗子通过QQ、微信发送PS的'通缉令''逮捕令'，以此恐吓受害者缴纳'保证金'配合调查。\n\n识别要点：\n• 真实通缉令不会通过社交媒体发送\n• 网上流传的案号可以伪造\n• 恐吓缴费是典型手段\n\n✅ 正确做法：带上疑似文件到就近派出所核实"),
        ("冒充网警通知账户异常",
         "【最新手法】骗子冒充'网安部门'，称受害者IP被用于访问违法网站，要求缴纳'清白保证金'消除记录，北京某大学生被骗8万元。\n\n⚠️ 网安部门不会电话要求缴纳任何费用！\n\n✅ 正确做法：直接拨打96110全国反诈热线咨询"),
    ],
    'invest': [
        ("虚假股票内部消息群",
         "【真实案例】被陌生人拉入'股票交流群'，'老师'前几次推荐确实小涨，信任建立后被引导到虚假APP入金，提现时被要求缴'手续费'，平台随即消失。\n\n识别要点：\n• 正规平台不会在微信群操盘\n• APP无法在应用商店找到\n• 提现需缴费=诈骗\n\n✅ 正确做法：在证监会官网查询平台资质"),
        ("杀猪盘投资诈骗",
         "【真实案例】网络恋人数月经营感情后，以'带你赚钱'为由推荐投资平台，初期显示盈利，追加大额资金后平台关闭，某女士损失120万。\n\n识别要点：\n• 网恋对象推荐投资=杀猪盘\n• 任何保本保收益的投资不存在\n• 平台只能通过链接下载\n\n✅ 正确做法：断绝联系，向公安机关报案"),
        ("虚假量化交易诈骗",
         "【最新手法】骗子推广'AI量化交易机器人'，声称月收益30%，要求入金5000体验，初期允许提现建立信任，追加投入后系统'故障'无法提现。\n\n⚠️ 世界上不存在稳定月收益30%的投资！\n\n✅ 正确做法：在中国证监会官网投资者教育栏目学习正规投资知识"),
        ("虚假基金理财诈骗",
         "【真实案例】骗子冒充'某银行理财经理'，推销所谓'内部产品'年化收益18%，要求转账到私人账户，资金到手后消失，某退休老人损失40万。\n\n识别要点：\n• 正规理财不会要求转账到私人账户\n• 年化18%以上的'理财'必有问题\n• 主动联系你的'理财经理'要警惕\n\n✅ 正确做法：只通过银行官方APP购买理财产品"),
        ("虚拟货币诈骗",
         "【最新手法】以'比特币''以太坊'等虚拟货币投资为噱头，声称掌握'内盘'信息，引导在非法交易所买入，操控价格后让受害者血本无归。\n\n⚠️ 国内虚拟货币交易所全部违法，谨防上当！\n\n✅ 正确做法：远离任何以'内盘''套利'为噱头的虚拟货币投资"),
    ],
    'parttime': [
        ("刷单垫付诈骗升级版",
         "【真实案例】先让垫付200元成功返款，建立信任后要求垫付2000元，再以'任务未完成需继续'为由要求垫付1万元，某大学生被骗2.3万元。\n\n识别要点：\n• 正规兼职绝不需要垫付任何资金\n• '先小后大'是标准套路\n• 刷单本身是违法行为\n\n✅ 正确做法：立即停止，不再追加资金"),
        ("网络兼职任务诈骗",
         "【最新手法】以'帮点赞赚佣金'为名，要求先在指定APP充值完成'任务'，充值后平台以'操作失误'为由要求继续充值，某学生被骗5000元。\n\n⚠️ 需要先充值才能做的兼职=诈骗！\n\n✅ 正确做法：通过正规招聘平台（智联、BOSS直聘）找兼职"),
        ("假冒客服退款诈骗",
         "【真实案例】自称某电商平台客服，声称购买的商品质量有问题，三倍赔偿，要求扫码登录'理赔系统'，实为钓鱼网站盗取账号密码。\n\n识别要点：\n• 真实退款直接原路退回，不需要任何操作\n• 退款不需要提供银行卡密码或验证码\n\n✅ 正确做法：挂断后直接在官方APP查看订单状态"),
        ("直播带货刷单诈骗",
         "【最新手法】以'直播刷单员'为由招募，要求在指定直播间下单截图，再由对方返款并额外给佣金，前几单正常，后续要求大额刷单后消失。\n\n⚠️ 所有需要垫付的直播兼职均为诈骗！"),
    ],
    'ai': [
        ("AI换脸诈骗",
         "【真实案例】骗子收集受害者亲属视频素材，利用AI实时换脸在视频通话中冒充其子女，以'车祸住院急需手术押金'为由要求紧急转账5万元。\n\n识别要点：\n• AI换脸技术已能实时伪造，视频通话不可全信\n• 要求不打电话核实、只转账是标志\n• 设置家庭暗号是最有效防范手段\n\n✅ 正确做法：挂断后拨打家人本人手机"),
        ("AI声音克隆诈骗",
         "【真实案例】骗子从微信朋友圈提取受害者儿子声音，通过电话精准克隆，以'被警察扣押需保释金'为由骗取老人2万元，被骗时完全未察觉。\n\n识别要点：\n• AI声音克隆技术已很成熟\n• 紧急情况要求转账但不让打回电话\n• 老年人是重点受害群体\n\n✅ 正确做法：设置家庭暗语，任何要钱先核实"),
        ("AI生成虚假证件诈骗",
         "【最新手法】骗子用AI生成逼真的警察证、检察院证件照片发给受害者，以此'证明'身份，再要求转账配合调查，某市民被骗20万。\n\n⚠️ AI生成的证件以假乱真，不能作为信任依据！\n\n✅ 正确做法：拨打110或96110向真实部门核实"),
        ("AI客服诈骗",
         "【最新手法】骗子部署AI聊天机器人冒充银行、购物平台客服，对话流畅自然，诱导用户点击钓鱼链接或提供验证码，已有多起百万损失案例。\n\n识别要点：\n• 真实客服不会主动联系要求验证码\n• 链接域名要仔细核查\n\n✅ 正确做法：挂断后拨打官方客服热线"),
    ],
    'romance': [
        ("网络交友情感诈骗",
         "【真实案例】在婚恋平台认识'高富帅'，热恋数月后对方以'生意周转'借款，从几千元到几万元，某女士借出30万后对方消失注销账号。\n\n识别要点：\n• 网恋对象从未见面却频繁借钱\n• 视频可能是录屏，不能证明真实身份\n• 感情发展过快且总有借钱理由\n\n✅ 正确做法：拒绝转账，要求视频通话并出示身份证"),
        ("杀猪盘新手法：棋牌引流",
         "【最新手法】骗子在网络棋牌游戏中与受害者建立友谊，共同'探索'投资机会，引导到虚假交易平台，以'内部充值返利'骗取大额资金。\n\n⚠️ 游戏中认识的'朋友'推荐投资=杀猪盘！"),
        ("虚假征婚诈骗",
         "【真实案例】骗子注册婚恋网站，伪造高收入白领身份，与受害者确立关系后以'家庭变故''公司资金周转'等理由多次借款，某女性被骗15万。\n\n识别要点：\n• 相识不久就谈借钱\n• 各种理由不愿见面\n• 还款时间一推再推\n\n✅ 正确做法：在见面确认真实身份前，拒绝任何金钱往来"),
    ],
    'loan': [
        ("无抵押贷款先缴费诈骗",
         "【真实案例】APP广告称'免征信秒批10万'，申请通过后要求先缴3000元'解冻费'才能放款，缴费后又要'保险费''税费'，受害者损失2万元未收到贷款。\n\n识别要点：\n• 正规贷款绝不会在放款前收取任何费用\n• '解冻费''保证金'是诈骗话术\n• 无法在应用商店找到的贷款APP要警惕\n\n✅ 正确做法：只通过银行、持牌金融机构申请贷款"),
        ("校园贷诈骗变种",
         "【最新手法】以'助学金''助学贷款'为噱头，通过社交媒体定向针对在校学生，要求缴纳'信息核实费'后放款，被骗后以裸照威胁还款，多名学生受害。\n\n⚠️ 正规助学金由学校发放，不需要任何费用！"),
        ("征信修复诈骗",
         "【真实案例】声称可以'删除'征信黑记录，收取服务费后失联；或以'征信有问题影响贷款'为由要求转账'清零'，实际无法修改征信。\n\n识别要点：\n• 征信无法删除，只能等待时效\n• 只有中国人民银行征信中心有权限处理\n• 任何'征信修复'服务均为诈骗\n\n✅ 正确做法：拨打12363（人民银行征信热线）咨询"),
    ],
    'prize': [
        ("虚假中奖缴税诈骗",
         "【真实案例】收到短信'恭喜中了88888元大奖'，要求先缴纳5000元个人所得税才能领取，缴税后又要求缴公证费、手续费，某市民被骗1.2万元。\n\n识别要点：\n• 真实中奖税费由主办方代扣，不会要求获奖者缴纳\n• 从未参与过的活动中了大奖=诈骗\n• 联系方式是私人号码而非官方客服\n\n✅ 正确做法：直接忽略，真正的大奖不会这样通知"),
        ("快递中奖诈骗",
         "【最新手法】快递一个神秘包裹，里面有'刮刮卡'中了大奖，附带客服电话，打去后要求缴纳'激活费'领奖，某大爷被骗5000元。\n\n⚠️ 从天而降的中奖快递100%是诈骗！"),
        ("积分兑换诈骗",
         "【最新手法】短信提示手机积分即将清零，可兑换现金或礼品，点击链接后进入钓鱼网站，要求输入银行卡号和密码'验证身份'。\n\n识别要点：\n• 官方积分兑换在官方APP内操作\n• 短信链接不要点\n• 兑换不需要银行卡密码\n\n✅ 正确做法：直接打开运营商官方APP查看积分"),
    ],
    'shop': [
        ("电商退款诈骗",
         "【真实案例】自称某平台客服，称购买商品质量有问题，三倍赔偿，要求在'理赔系统'操作，实为钓鱼网站，某消费者账户被转走2万元。\n\n识别要点：\n• 真实退款直接原路退回\n• 客服不会要求验证码或银行密码\n• 警惕要求'屏幕共享'的操作\n\n✅ 正确做法：挂断后直接在官方平台查订单"),
        ("假冒客服保证金诈骗",
         "【最新手法】冒充某购物平台客服，声称账号涉嫌刷单被冻结，需缴纳'解冻保证金'，缴后平台消失，共有数百名受害者。\n\n⚠️ 电商平台不存在'保证金解冻'这种操作！"),
        ("虚假购物网站诈骗",
         "【真实案例】仿冒知名电商网站，商品价格极低，下单付款后货物迟迟不到，联系客服被拉黑，某消费者损失3000元。\n\n识别要点：\n• 域名与官方网站不同\n• 价格远低于市场价\n• 只支持转账，不支持第三方支付\n\n✅ 正确做法：只在官方APP或正规平台购物"),
    ],
    'credit': [
        ("网贷征信诈骗",
         "【真实案例】骗子声称受害者在校期间注册的校园贷记录影响征信，需要'配合银行工作人员'将钱转到指定账户'核实清零'，多名学生被骗数万元。\n\n识别要点：\n• 征信问题不会要求转账处理\n• 银行不会以这种方式联系客户\n• 只有央行征信中心有权处理征信\n\n✅ 正确做法：拨打12363核实，挂断可疑电话"),
        ("个人信息泄露征信诈骗",
         "【最新手法】以'您的个人信息泄露导致征信受损，需配合修复'为由，引导受害者下载远程控制APP或转账，实为盗取账户资金。\n\n⚠️ 任何要求下载APP或转账修复征信的都是诈骗！"),
    ],
    'game': [
        ("低价游戏账号诈骗",
         "【真实案例】某学生在二手平台购买低价王者荣耀账号，付了300元定金后卖家以'账号锁定'为由要求再付200元解锁费，缴完后联系不上。\n\n识别要点：\n• 价格远低于市场价的账号必有猫腻\n• 付定金后各种理由追加费用是套路\n• 正规平台有官方保障，私下交易有风险\n\n✅ 正确做法：通过官方平台（5173、交易猫）买卖"),
        ("游戏充值返利诈骗",
         "【最新手法】在游戏内或群里发布'充值返利'活动，承诺充1000返2000，前几次小额正常，大额充值后消失，多名玩家被骗。\n\n⚠️ 游戏官方绝不会在群里发充值返利活动！"),
        ("游戏代练诈骗",
         "【真实案例】花钱找代练提升游戏段位，缴费后代练不上线，客服推脱，账号还可能被盗，某玩家损失2000元且账号被封。\n\n识别要点：\n• 无法核实代练真实身份\n• 提供账号密码存在被盗风险\n• 平台无法保障\n\n✅ 正确做法：通过有保障的正规代练平台"),
    ],
    'elder': [
        ("保健品免费体检诈骗",
         "【真实案例】以'免费健康讲座'引诱老年人参加，安排假'专家'检测后声称有多种严重疾病，推销数千元天价保健品，北京某老人花费12万买'神药'。\n\n识别要点：\n• 免费礼品+健康讲座=诈骗套路\n• 保健品不能治疗疾病（违法声称）\n• 限时优惠制造紧迫感\n\n✅ 正确做法：身体不适到正规医院检查，不信'免费讲座'"),
        ("养老投资诈骗",
         "【真实案例】以'养老公寓''养老基地'为噱头，承诺交钱入住高端养老社区，等老人交完几十万后机构人去楼空，某老两口损失60万。\n\n⚠️ 养老机构需在民政局备案，交款前务必核实！\n\n✅ 正确做法：通过民政局网站查询合法养老机构"),
        ("冒充子女借钱诈骗",
         "【真实案例】骗子冒充在外地工作的子女，以'遭遇事故急需住院费'为由发微信借钱，并要求不要打电话以免耽误'手术'，某老人汇款2万元。\n\n识别要点：\n• 要求不打电话核实是关键控制手段\n• AI可以克隆子女声音\n• 紧急借钱务必多方核实\n\n✅ 正确做法：挂断后立即拨打子女本人手机号"),
    ],
}


def _generate_push_content(sub: dict) -> tuple:
    """根据用户身份年龄自动生成个性化推送内容"""
    identity = sub.get('identity', 'adult')
    age = int(sub.get('age') or 30)

    # 根据身份和年龄自动选推送类型（不再依赖手动选择的 types）
    identity_types = {
        'elder': ['police', 'ai', 'romance', 'prize'],
        'student': ['parttime', 'loan', 'game', 'shop'],
        'financial': ['invest', 'police', 'romance'],
        'adult': ['police', 'invest', 'ai'],
        'other': ['police', 'invest', 'ai'],
    }
    # 老年人（60+）特别加强公检法和AI诈骗
    if age >= 60:
        types = ['police', 'ai', 'romance', 'prize']
    # 大学生（18-25）加强刷单和贷款
    elif age <= 25:
        types = ['parttime', 'loan', 'game', 'shop']
    else:
        types = identity_types.get(identity, identity_types['adult'])

    # 随机选一个类型推送（老年人额外加入 elder 专属案例）
    push_type = random.choice(types)
    if identity == 'elder' or age >= 60:
        # 老年人有30%概率推送专属老年人案例
        if random.random() < 0.3 and 'elder' in CASE_POOL:
            push_type = 'elder'
    cases = CASE_POOL.get(push_type, CASE_POOL['police'])
    title, body = random.choice(cases)

    identity = sub.get('identity', 'adult')
    tip_map = {
        'elder': '\n\n👴 老年人提示：遇到不确定的情况，先挂断电话联系子女确认！',
        'student': '\n\n🎓 学生提示：垫付资金、助学贷款相关的都要特别小心！',
        'financial': '\n\n💼 财务提示：任何转账指令务必通过官方渠道二次核实！',
        'adult': '\n\n💡 温馨提示：遇到可疑情况，拨打96110咨询！',
    }
    body += tip_map.get(identity, tip_map['adult'])
    body += '\n\n📱 反诈热线：96110 · 全天候服务'
    return title, body


# ── 定时推送任务 ──────────────────────────────────────────
scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")


async def _do_push():
    """定时推送任务（每天9点运行，按频率过滤）"""
    print(f"[Subscribe] 开始推送任务 {datetime.now()}")
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        subs = conn.execute("SELECT * FROM subscriptions WHERE active=1").fetchall()

    now = datetime.now()
    pushed = 0
    for sub in subs:
        sub = dict(sub)
        freq = sub.get('frequency', 'weekly')
        last = sub.get('last_push', '')

        # 检查是否需要推送
        should_push = False
        if freq == 'daily':
            should_push = True
        elif freq == 'weekly' and now.weekday() == 0:  # 周一
            should_push = True
        elif freq == 'biweekly' and now.weekday() == 0:
            if last:
                last_dt = datetime.strptime(last[:10], "%Y-%m-%d")
                should_push = (now - last_dt).days >= 14
            else:
                should_push = True

        if not should_push:
            continue

        title, content = _generate_push_content(sub)
        remark = "点击查看完整案例 · 反诈热线：96110"

        # 优先 Server酱（serverchan_key），再试微信模板，最后邮件
        serverchan_key = sub.get('serverchan_key', '')
        wx_ok = False
        sc_ok = await _send_serverchan(serverchan_key, title, content)
        if not sc_ok:
            wx_ok = await _send_wx_template(sub.get('openid', ''), title, content, remark)
        email_ok = False
        if not sc_ok and not wx_ok:
            email_ok = await _send_email_push(sub.get('email', ''), title, content)

        if wx_ok or email_ok:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute("UPDATE subscriptions SET last_push=? WHERE user_id=?",
                             (now.strftime("%Y-%m-%d %H:%M:%S"), sub['user_id']))
                conn.commit()
            pushed += 1

    print(f"[Subscribe] 推送完成，共推送 {pushed} 位用户")


def start_scheduler():
    """在 app 启动时调用"""
    scheduler.add_job(_do_push, 'cron', hour=9, minute=0, id='daily_push', replace_existing=True)
    if not scheduler.running:
        scheduler.start()
    print("[Subscribe] 定时推送调度器已启动（每天09:00执行）")


# ── API 路由 ──────────────────────────────────────────────
@router.post("/subscribe")
async def subscribe(data: dict):
    try:
        if not data.get('user_id'):
            return JSONResponse({"ok": False, "error": "缺少用户ID"})
        _save_sub(data)
        return JSONResponse({"ok": True, "msg": "订阅成功"})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@router.post("/subscribe/cancel")
async def cancel_subscribe(data: dict):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("UPDATE subscriptions SET active=0 WHERE user_id=?", (data.get('user_id'),))
            conn.commit()
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@router.get("/subscribe/status")
async def get_subscribe_status(user_id: str):
    sub = _get_sub(user_id)
    if sub and sub.get('active'):
        return JSONResponse({"ok": True, "active": True, "data": {
            "frequency": sub['frequency'],
            "types": json.loads(sub.get('types', '[]')),
            "fraud_types": json.loads(sub.get('types', '[]')),
            "contents": json.loads(sub.get('contents', '[]')),
            "last_push": sub.get('last_push', ''),
            "serverchan_key": sub.get('serverchan_key', ''),
            "email": sub.get('email', ''),
            "openid": sub.get('openid', ''),
            "identity": sub.get('identity', 'adult'),
            "age": sub.get('age', ''),
        }})
    return JSONResponse({"ok": True, "active": False})


@router.post("/subscribe/test-push")
async def test_push(data: dict):
    """手动触发一次推送（测试用）"""
    user_id = data.get('user_id')
    sub = _get_sub(user_id)
    if not sub:
        return JSONResponse({"ok": False, "error": "未找到订阅"})
    title, content = _generate_push_content(sub)
    sc_ok = await _send_serverchan(sub.get('serverchan_key', ''), title, content)
    wx_ok = False
    if not sc_ok:
        wx_ok = await _send_wx_template(sub.get('openid', ''), title, content, "测试推送 · 反诈热线：96110")
    email_ok = False
    if not sc_ok and not wx_ok:
        email_ok = await _send_email_push(sub.get('email', ''), title, content)
    ok = sc_ok or wx_ok or email_ok
    channel = '微信Server酱' if sc_ok else ('微信模板' if wx_ok else ('邮件' if email_ok else '无'))
    return JSONResponse({"ok": ok, "sc": sc_ok, "wx": wx_ok, "email": email_ok,
                         "title": title, "content": content[:100] + "...", "channel": channel,
                         "error": None if ok else "请检查：1.邮箱是否填写 2.Server酱Key是否正确(SCT开头) 3.后端SMTP配置"})