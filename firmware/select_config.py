"""Escolhe somente config.h deste projeto, sem confundir headers do SDK."""
from pathlib import Path
Import("env")
if (Path(env.subst("$PROJECT_DIR")) / "include" / "config.h").is_file():
    env.Append(CPPDEFINES=["ESTOQUE_LOCAL_CONFIG"])
