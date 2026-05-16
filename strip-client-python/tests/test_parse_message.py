import struct
import pytest
from strip_client import FrameBuffer, parse_server_message, MSG_FRAME, MSG_SYNC, _reorder


# ---------------------------------------------------------------------------
# Binary message builders
# ---------------------------------------------------------------------------

def make_frame_msg(ts_ms: int, frame_num: int, pixels: bytes) -> bytes:
    pixel_count = len(pixels) // 3
    hi = ts_ms >> 32
    lo = ts_ms & 0xFFFFFFFF
    header = struct.pack(">BIIHHH", MSG_FRAME, hi, lo, frame_num, pixel_count, 0)
    # header is 15 bytes; we need 13 bytes header so rebuild manually
    buf = bytes([MSG_FRAME])
    buf += struct.pack(">II", ts_ms >> 32, ts_ms & 0xFFFFFFFF)  # 8 bytes timestamp
    buf += struct.pack(">H", frame_num)                          # 2 bytes frame num
    buf += struct.pack(">H", pixel_count)                        # 2 bytes pixel count
    buf += pixels
    return buf


def make_frame_msg_rgbw(ts_ms: int, pixels: bytes) -> bytes:
    pixel_count = len(pixels) // 4
    buf = bytes([MSG_FRAME])
    buf += struct.pack(">II", ts_ms >> 32, ts_ms & 0xFFFFFFFF)
    buf += struct.pack(">H", 0)            # frame num
    buf += struct.pack(">H", pixel_count)  # pixel count
    buf += pixels
    return buf


def make_sync_msg(ts_ms: int, fps: int) -> bytes:
    buf = bytes([MSG_SYNC])
    buf += struct.pack(">II", ts_ms >> 32, ts_ms & 0xFFFFFFFF)
    buf += struct.pack(">H", fps)
    return buf


# ---------------------------------------------------------------------------
# parse_server_message
# ---------------------------------------------------------------------------

@pytest.fixture
def buf():
    return FrameBuffer()


class TestParseServerMessage:
    def test_returns_none_for_empty_data(self, buf):
        assert parse_server_message(b"", buf) is None

    def test_returns_none_for_unknown_type(self, buf):
        assert parse_server_message(bytes([0xff] + [0] * 12), buf) is None

    def test_returns_none_for_frame_msg_too_short(self, buf):
        assert parse_server_message(bytes([MSG_FRAME, 0, 0]), buf) is None

    def test_returns_frame_for_valid_msg_frame(self, buf):
        msg = make_frame_msg(1000, 0, bytes([255, 0, 0]))
        result = parse_server_message(msg, buf)
        assert result == "frame"

    def test_adds_frame_to_buffer(self, buf):
        pixels = bytes([255, 0, 0, 0, 255, 0])
        msg = make_frame_msg(1000, 0, pixels)
        parse_server_message(msg, buf)
        assert buf.buffered_count() == 1
        assert buf.get_frame(1000) == pixels

    def test_decodes_timestamp_correctly(self, buf):
        ts = 1_700_000_000_123
        msg = make_frame_msg(ts, 0, bytes([1, 2, 3]))
        parse_server_message(msg, buf)
        assert buf.get_frame(ts) is not None

    def test_detects_bpp3_rgb(self, buf):
        pixels = bytes([10, 20, 30])  # 1 pixel × 3 bytes
        msg = make_frame_msg(1000, 0, pixels)
        parse_server_message(msg, buf)
        frame = buf.get_frame(1000)
        assert len(frame) == 3

    def test_detects_bpp4_rgbw(self, buf):
        pixels = bytes([10, 20, 30, 40])  # 1 pixel × 4 bytes
        msg = make_frame_msg_rgbw(1000, pixels)
        parse_server_message(msg, buf)
        frame = buf.get_frame(1000)
        assert len(frame) == 4

    def test_returns_sync_for_valid_msg_sync(self, buf):
        msg = make_sync_msg(2000, 60)
        result = parse_server_message(msg, buf)
        assert result == "sync"

    def test_sync_updates_fps(self, buf):
        msg = make_sync_msg(0, 60)
        parse_server_message(msg, buf)
        assert buf.fps == 60

    def test_sync_removes_frames_at_or_after_timestamp(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        msg = make_sync_msg(2000, 30)
        parse_server_message(msg, buf)
        assert buf.buffered_count() == 1  # only 1000 remains

    def test_returns_none_for_sync_msg_too_short(self, buf):
        assert parse_server_message(bytes([MSG_SYNC, 0, 0]), buf) is None

    def test_large_timestamp_round_trips(self, buf):
        # Test high 32-bit portion is decoded correctly
        ts = 0x1_0000_0000  # exactly 1 in the hi word
        msg = make_frame_msg(ts, 0, bytes([1, 2, 3]))
        parse_server_message(msg, buf)
        assert buf.get_frame(ts) is not None


# ---------------------------------------------------------------------------
# _reorder
# ---------------------------------------------------------------------------

class TestReorder:
    def test_grb_reorders_to_green_red_blue(self):
        assert _reorder("GRB", 255, 0, 0) == (0, 255, 0)   # red input → G=0, R=255, B=0
        assert _reorder("GRB", 0, 255, 0) == (255, 0, 0)   # green input → G=255, R=0, B=0

    def test_rgb_passthrough(self):
        assert _reorder("RGB", 10, 20, 30) == (10, 20, 30)

    def test_bgr(self):
        # _reorder("BGR", r, g, b) returns (b, g, r)
        assert _reorder("BGR", 1, 2, 3) == (3, 2, 1)

    def test_brg(self):
        # _reorder("BRG", r, g, b) returns (b, r, g)
        assert _reorder("BRG", 1, 2, 3) == (3, 1, 2)

    def test_rbg(self):
        # _reorder("RBG", r, g, b) returns (r, b, g)
        assert _reorder("RBG", 1, 2, 3) == (1, 3, 2)

    def test_gbr(self):
        # _reorder("GBR", r, g, b) returns (g, b, r)
        assert _reorder("GBR", 1, 2, 3) == (2, 3, 1)

    def test_unknown_order_returns_rgb(self):
        assert _reorder("XYZ", 10, 20, 30) == (10, 20, 30)

    def test_all_zeros(self):
        for order in ("GRB", "RGB", "BGR", "BRG", "RBG", "GBR"):
            assert _reorder(order, 0, 0, 0) == (0, 0, 0)
