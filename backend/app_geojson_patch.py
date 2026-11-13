#!/usr/bin/env python3
"""
app_geojson_patch.py
把 app.py 里的 /api/china-geojson 接口替换为：
启动时从阿里云DataV拉取高精度GeoJSON并本地缓存
放到项目目录运行: python app_geojson_patch.py
"""
import shutil
from pathlib import Path

APP_FILE = Path("app.py")
if not APP_FILE.exists():
    print("ERROR: 找不到 app.py")
    exit(1)

shutil.copy(APP_FILE, "app.py.bak")
content = APP_FILE.read_text(encoding="utf-8")

OLD = '@app.get("/api/china-geojson")\nasync def china_geojson():'
NEW_FUNC = '''@app.get("/api/china-geojson")
async def china_geojson():
    """
    返回高精度中国省级GeoJSON
    优先从阿里云DataV拉取（精准），本地缓存后离线可用
    """
    import json as _j, httpx as _hx
    from fastapi.responses import JSONResponse as _JR
    CACHE = Path("./china_geo_cache.json")
    # 有缓存直接返回
    if CACHE.exists():
        return _JR(_j.loads(CACHE.read_text("utf-8")))
    # 从阿里云DataV拉取高精度数据
    SOURCES = [
        "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
        "https://cdn.jsdelivr.net/npm/echarts@5.4.3/map/json/china.json",
    ]
    for url in SOURCES:
        try:
            async with _hx.AsyncClient(timeout=10) as client:
                r = await client.get(url)
            if r.status_code == 200:
                geo = r.json()
                # 简化省份名（阿里DataV用全名如"新疆维吾尔自治区"）
                for f in geo.get("features", []):
                    n = f.get("properties", {}).get("name", "")
                    n = (n.replace("维吾尔自治区","").replace("壮族自治区","")
                          .replace("回族自治区","").replace("自治区","")
                          .replace("特别行政区","").replace("省","").replace("市",""))
                    f["properties"]["name"] = n
                CACHE.write_text(_j.dumps(geo, ensure_ascii=False), "utf-8")
                print(f"[GeoJSON] 已从 {url} 缓存高精度地图数据")
                return _JR(geo)
        except Exception as e:
            print(f"[GeoJSON] {url} 失败: {e}")
    # 全部失败返回内嵌简化版'''

# 找到旧接口的完整函数（从装饰器到函数体结束）
start = content.find('@app.get("/api/china-geojson")')
if start < 0:
    print("ERROR: 找不到 /api/china-geojson 接口")
    exit(1)

# 找函数结束（下一个 @app. 装饰器或文件末尾）
end = content.find('\n@app.', start + 50)
if end < 0:
    end = len(content)

old_func = content[start:end]
print(f"找到旧接口，长度 {len(old_func)} 字节")
print(f"前50字符: {old_func[:50]!r}")

# 保留旧的内嵌GeoJSON数据（作为最终备用）
# 找到 _GEO = {...} 这行
geo_line_start = old_func.find("    _GEO =")
if geo_line_start >= 0:
    # 找到旧的return语句
    old_return_start = old_func.find("    return _GEO")
    old_geo_data = old_func[geo_line_start:old_return_start + len("    return _GEO")]
    FALLBACK = f"""
    # 内嵌备用（网络不通时使用）
{old_geo_data}"""
else:
    FALLBACK = "\n    return {\"type\":\"FeatureCollection\",\"features\":[]}"

new_content = content[:start] + NEW_FUNC + FALLBACK + "\n\n" + content[end:]
APP_FILE.write_text(new_content, encoding="utf-8")
print(f"✅ app.py 替换完成！新文件 {len(new_content)} 字节")
print("\n重启后端后，首次加载地图会自动从阿里云拉取精准数据并缓存到 china_geo_cache.json")
