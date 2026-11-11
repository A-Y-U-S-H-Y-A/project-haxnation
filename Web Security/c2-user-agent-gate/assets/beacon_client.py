#!/usr/bin/env python3
# ============================================================================
# EVIDENCE SNIPPET — extracted from coinnectar/_auto_update.py during review.
# Non-functional excerpt: only the User-Agent construction is reproduced here;
# the networking / beacon loop has been removed by the forensics team.
#
# Finding: the SDK's "auto-update / telemetry" check talks to a server that
# only answers requests carrying one exact User-Agent. Anything else gets a
# bland decoy, so scanners and plain `curl` see a healthy CDN and move on.
#
# Evasion note: the build tag is assembled from an ENCODED constant at runtime,
# so a static scan of the source never reveals the literal UA string. Recover
# the real User-Agent to see what the implant was actually told to do.
# ============================================================================
import base64

# --- User-Agent assembly (the only part that matters for triage) -----------
_PLATFORM = "Mozilla/5.0 (X11; Linux x86_64)"
_PRODUCT = "Coinnectar-Updater/3.4.7"

# build tag stored base64-encoded so it does not appear in cleartext
_BUILD_TAG_B64 = "QzBMTEVDVDBS"


def _user_agent() -> str:
    tag = base64.b64decode(_BUILD_TAG_B64).decode()
    return f"{_PLATFORM} {_PRODUCT} Build/{tag}"


# [redacted] _snapshot(), beacon(), scheduler, and transport removed by analyst.
# The server-side gate checks the header produced by _user_agent() verbatim.
