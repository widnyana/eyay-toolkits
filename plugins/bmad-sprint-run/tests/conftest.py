import sys
from pathlib import Path

# Put the plugin root on sys.path so tests can `import lib.*` regardless of
# where pytest is invoked from.
_PLUGIN_ROOT = Path(__file__).resolve().parent.parent
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))
