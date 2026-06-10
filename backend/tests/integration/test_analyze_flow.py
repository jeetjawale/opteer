import pytest
class TestAnalyzeEndpoint:
    def test_analyze_success_returns_202_queued(self): pass
    def test_analyze_returns_409_when_already_processing(self): pass
    def test_analyze_returns_409_when_already_queued(self): pass
    def test_analyze_retry_from_failed_queues_again(self): pass
    def test_analyze_returns_404_for_nonexistent_application(self): pass
    def test_analyze_returns_404_for_wrong_user(self): pass
