from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "WildStat AI Service"
    model_path: str = "models/yolo/best.pt"
    confidence_threshold: float = 0.35
    predictions_output_dir: str = "outputs/predictions"
    output_frames_dir: str = "outputs/frames"
    output_clips_dir: str = "outputs/clips"
    temp_uploads_dir: str = "uploads/temp"
    default_confidence_threshold: float = 0.3
    default_frame_interval_seconds: float = 1.0
    default_event_gap_seconds: float = 10.0
    default_clip_padding_seconds: float = 3.0
    default_max_frames: int = 300
    yolo_device: str = "mps"


settings = Settings()
