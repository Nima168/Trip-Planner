from datetime import time
from typing import Annotated

from pydantic import PlainSerializer

# Serializes datetime.time as "HH:MM" (no seconds), per api-contract.md's Conventions.
# Parsing "HH:MM" input strings into time is handled natively by pydantic's time validator.
TimeHHMM = Annotated[time, PlainSerializer(lambda t: t.strftime("%H:%M"), return_type=str)]
