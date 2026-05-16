import os
import sys

# Must be set before strip_client is imported so MOCK=True at module load
os.environ["MOCK_NEOPIXEL"] = "1"

# Allow `import strip_client` from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
