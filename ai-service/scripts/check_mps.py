from __future__ import annotations

import platform
import sys


def main() -> None:
    print(f"Python: {sys.version.split()[0]}")
    print(f"Platform: {platform.platform()}")

    try:
        import torch
    except Exception as exc:
        print(f"torch: unavailable ({exc})")
        print("selected_device=cpu")
        return

    print(f"torch: {torch.__version__}")
    mps_available = bool(
        hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
    )
    print(f"mps_available={mps_available}")
    print(f"selected_device={'mps' if mps_available else 'cpu'}")


if __name__ == "__main__":
    main()
