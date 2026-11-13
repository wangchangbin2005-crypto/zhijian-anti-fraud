"""
模块01：多模态输入支持
支持文本、音频、视觉三种模态的输入接收与预处理
依赖: pip install fastapi uvicorn python-multipart openai pillow pydub SpeechRecognition
"""

import os
if os.getenv("FFMPEG_BIN"):
    os.environ["PATH"] += os.pathsep + os.environ["FFMPEG_BIN"]
import base64
import tempfile
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field

import speech_recognition as sr
from PIL import Image
from pydub import AudioSegment
from fastapi import UploadFile

# Windows 下直接指定 ffmpeg 路径，避免 PATH 未生效的问题
AudioSegment.converter = os.getenv("FFMPEG_EXE", "ffmpeg")
AudioSegment.ffmpeg   = os.getenv("FFMPEG_EXE", "ffmpeg")
AudioSegment.ffprobe  = os.getenv("FFPROBE_EXE", "ffprobe")


# ─────────────────────────────────────────────
# 数据结构：统一多模态输入容器
# ─────────────────────────────────────────────

@dataclass
class MultimodalInput:
    """统一的多模态输入结构，传递给后续决策模块"""
    text: Optional[str] = None          # 文本内容（聊天记录/短信/语音转文字）
    image_b64: Optional[str] = None     # 图片 base64（截图/图片）
    audio_text: Optional[str] = None    # 音频转写文本
    source_type: str = "unknown"        # 来源类型：text / audio / image / mixed
    raw_metadata: dict = field(default_factory=dict)  # 原始元数据


# ─────────────────────────────────────────────
# 文本模态处理器
# ─────────────────────────────────────────────

class TextProcessor:
    """处理文本输入：聊天记录、短信、用户直接输入"""

    MAX_LENGTH = 4000  # 单次最大字符数（避免超出 LLM 上下文）

    def process(self, text: str) -> MultimodalInput:
        cleaned = self._clean(text)
        return MultimodalInput(
            text=cleaned,
            source_type="text",
            raw_metadata={"original_length": len(text), "cleaned_length": len(cleaned)},
        )

    def _clean(self, text: str) -> str:
        """基础清洗：去除多余空白、截断过长内容"""
        text = text.strip()
        # 保留最近内容（尾部）以保留上下文重点
        if len(text) > self.MAX_LENGTH:
            text = "...(已截断)\n" + text[-self.MAX_LENGTH:]
        return text


# ─────────────────────────────────────────────
# 音频模态处理器
# ─────────────────────────────────────────────

class AudioProcessor:
    """处理音频输入：实时通话录音、语音消息文件"""

    SUPPORTED_FORMATS = {".mp3", ".wav", ".ogg", ".m4a", ".flac"}

    def __init__(self):
        self.recognizer = sr.Recognizer()
        # 降噪参数：对环境噪音敏感的场景可适当调大
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True

    def process(self, file: UploadFile) -> MultimodalInput:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in self.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的音频格式: {suffix}，支持: {self.SUPPORTED_FORMATS}")

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name

        try:
            wav_path = self._convert_to_wav(tmp_path, suffix)
            transcript = self._transcribe(wav_path)
        finally:
            os.unlink(tmp_path)

        return MultimodalInput(
            text=transcript,
            audio_text=transcript,
            source_type="audio",
            raw_metadata={"filename": file.filename, "format": suffix},
        )

    def _convert_to_wav(self, path: str, suffix: str) -> str:
        """将非 WAV 格式统一转为 WAV 供识别器使用"""
        if suffix == ".wav":
            return path
        audio = AudioSegment.from_file(path)
        wav_path = path.replace(suffix, ".wav")
        audio.export(wav_path, format="wav")
        return wav_path

    def _transcribe(self, wav_path: str) -> str:
        """调用 Google Speech Recognition（离线场景可替换为 Whisper）"""
        with sr.AudioFile(wav_path) as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio_data = self.recognizer.record(source)
        try:
            # language="zh-CN" 支持普通话，可按需替换为其他方言
            return self.recognizer.recognize_google(audio_data, language="zh-CN")
        except sr.UnknownValueError:
            return "[音频无法识别，可能为静音或噪音过大]"
        except sr.RequestError as e:
            raise RuntimeError(f"语音识别服务异常: {e}")


# ─────────────────────────────────────────────
# 视觉模态处理器
# ─────────────────────────────────────────────

class ImageProcessor:
    """处理图像输入：截图、图片，转为 base64 供 VLM 分析"""

    SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    MAX_DIMENSION = 1280   # 长边最大像素，超出则缩放以节省 token
    JPEG_QUALITY = 85

    def process(self, file: UploadFile) -> MultimodalInput:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in self.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的图片格式: {suffix}")

        image_bytes = file.file.read()
        b64 = self._resize_and_encode(image_bytes)

        return MultimodalInput(
            image_b64=b64,
            source_type="image",
            raw_metadata={"filename": file.filename, "format": suffix},
        )

    def _resize_and_encode(self, image_bytes: bytes) -> str:
        """缩放超大图片后转 base64"""
        with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
            img = Image.open(tempfile.SpooledTemporaryFile())
            img = Image.open(__import__("io").BytesIO(image_bytes))

            # 等比缩放
            w, h = img.size
            if max(w, h) > self.MAX_DIMENSION:
                ratio = self.MAX_DIMENSION / max(w, h)
                img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

            # 转为 RGB（去除 alpha 通道）并编码
            buf = __import__("io").BytesIO()
            img.convert("RGB").save(buf, format="JPEG", quality=self.JPEG_QUALITY)
            return base64.b64encode(buf.getvalue()).decode("utf-8")


# ─────────────────────────────────────────────
# 多模态输入路由器（统一入口）
# ─────────────────────────────────────────────

class MultimodalInputRouter:
    """
    统一入口，根据请求类型路由到对应处理器。
    FastAPI 路由层调用此类，返回标准 MultimodalInput 对象。
    """

    def __init__(self):
        self.text_proc = TextProcessor()
        self.audio_proc = AudioProcessor()
        self.image_proc = ImageProcessor()

    def route_text(self, text: str) -> MultimodalInput:
        return self.text_proc.process(text)

    def route_audio(self, file: UploadFile) -> MultimodalInput:
        return self.audio_proc.process(file)

    def route_image(self, file: UploadFile) -> MultimodalInput:
        return self.image_proc.process(file)

    def route_mixed(self, text: str, file: UploadFile) -> MultimodalInput:
        """同时包含文字描述和图片/音频的混合输入"""
        suffix = Path(file.filename).suffix.lower()
        if suffix in self.image_proc.SUPPORTED_FORMATS:
            img_input = self.image_proc.process(file)
            return MultimodalInput(
                text=self.text_proc._clean(text),
                image_b64=img_input.image_b64,
                source_type="mixed",
                raw_metadata={"has_text": True, "has_image": True},
            )
        elif suffix in self.audio_proc.SUPPORTED_FORMATS:
            audio_input = self.audio_proc.process(file)
            combined_text = f"[用户描述] {text}\n[语音转写] {audio_input.audio_text}"
            return MultimodalInput(
                text=combined_text,
                audio_text=audio_input.audio_text,
                source_type="mixed",
                raw_metadata={"has_text": True, "has_audio": True},
            )
        raise ValueError("混合输入中的文件格式无法识别")


# ─────────────────────────────────────────────
# FastAPI 路由（与主 app.py 集成）
# ─────────────────────────────────────────────

from fastapi import APIRouter, File, Form, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/input", tags=["模块01-多模态输入"])
input_router = MultimodalInputRouter()


@router.post("/text")
async def receive_text(text: str = Form(...)):
    """接收纯文本（聊天记录/短信）"""
    try:
        result = input_router.route_text(text)
        return JSONResponse({"status": "ok", "source_type": result.source_type, "text": result.text})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/audio")
async def receive_audio(file: UploadFile = File(...)):
    """接收音频文件（通话录音/语音消息）"""
    try:
        result = input_router.route_audio(file)
        return JSONResponse({"status": "ok", "source_type": result.source_type, "transcript": result.audio_text})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/image")
async def receive_image(file: UploadFile = File(...)):
    """接收图片（截图/图片）"""
    try:
        result = input_router.route_image(file)
        return JSONResponse({"status": "ok", "source_type": result.source_type, "image_b64_preview": result.image_b64[:64] + "..."})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mixed")
async def receive_mixed(text: str = Form(...), file: UploadFile = File(...)):
    """接收图文/音文混合输入"""
    try:
        result = input_router.route_mixed(text, file)
        return JSONResponse({"status": "ok", "source_type": result.source_type, "text": result.text})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))