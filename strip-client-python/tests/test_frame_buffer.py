import pytest
from strip_client import FrameBuffer


@pytest.fixture
def buf():
    return FrameBuffer()


class TestFrameBufferInit:
    def test_starts_empty(self, buf):
        assert buf.buffered_count() == 0

    def test_default_fps_is_30(self, buf):
        assert buf.fps == 30

    def test_max_frames_equals_fps(self, buf):
        assert buf.max_frames == 30
        buf.fps = 60
        assert buf.max_frames == 60

    def test_get_frame_returns_none_when_empty(self, buf):
        assert buf.get_frame(1_000_000) is None


class TestAddAndGetFrame:
    def test_get_frame_at_exact_timestamp(self, buf):
        pixels = bytes([255, 0, 0])
        buf.add_frame(1000, pixels)
        assert buf.get_frame(1000) == pixels

    def test_get_frame_returns_latest_at_or_before_now(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        assert buf.get_frame(2500) == bytes([2])

    def test_get_frame_does_not_return_future_frames(self, buf):
        buf.add_frame(9000, bytes([99]))
        assert buf.get_frame(5000) is None

    def test_get_frame_removes_consumed_and_older_frames(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        buf.get_frame(2000)  # consumes 2000, evicts 1000
        assert buf.buffered_count() == 1  # only 3000 remains

    def test_get_frame_keeps_newer_frames(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(5000, bytes([2]))
        buf.get_frame(1000)
        assert buf.get_frame(5000) == bytes([2])

    def test_get_frame_returns_last_frame_on_underrun(self, buf):
        pixels = bytes([42, 43, 44])
        buf.add_frame(100, pixels)
        buf.get_frame(100)   # consumes it, sets last_frame
        assert buf.get_frame(200) == pixels  # underrun → last_frame

    def test_last_frame_is_none_before_any_get(self, buf):
        buf.add_frame(1000, bytes([1]))
        # last_frame not yet set — underrun before first get returns None
        assert buf.get_frame(500) is None


class TestSync:
    def test_removes_frames_at_or_after_from_ms(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        buf.sync(2000, 30)
        assert buf.buffered_count() == 1
        assert buf.get_frame(1000) == bytes([1])

    def test_updates_fps(self, buf):
        buf.sync(0, 60)
        assert buf.fps == 60

    def test_clears_all_frames_when_from_ms_is_zero(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.sync(0, 30)
        assert buf.buffered_count() == 0

    def test_keeps_frames_before_from_ms(self, buf):
        buf.add_frame(500, bytes([1]))
        buf.sync(1000, 30)
        assert buf.buffered_count() == 1


class TestEvict:
    def test_drops_oldest_frames_when_over_max(self, buf):
        buf.fps = 3  # max_frames = 3
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        buf.add_frame(4000, bytes([4]))  # triggers eviction
        assert buf.buffered_count() == 3
        assert buf.get_frame(1000) is None  # 1000 was evicted

    def test_keeps_newest_frames_after_eviction(self, buf):
        buf.fps = 2
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        assert buf.get_frame(3000) == bytes([3])

    def test_no_eviction_when_at_max(self, buf):
        buf.fps = 3
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.add_frame(3000, bytes([3]))
        assert buf.buffered_count() == 3  # exactly at max, nothing dropped


class TestBufferedCount:
    def test_accurate_count(self, buf):
        assert buf.buffered_count() == 0
        buf.add_frame(1000, bytes([1]))
        assert buf.buffered_count() == 1
        buf.add_frame(2000, bytes([2]))
        assert buf.buffered_count() == 2

    def test_decreases_after_get(self, buf):
        buf.add_frame(1000, bytes([1]))
        buf.add_frame(2000, bytes([2]))
        buf.get_frame(2000)
        assert buf.buffered_count() == 0
