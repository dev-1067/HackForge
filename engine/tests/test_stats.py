import math

from engine.stats import FeatureStats, HourStats, wrap_hours


def test_wrap_hours_is_shortest_distance_on_the_clock():
    assert wrap_hours(23.5 - 0.5) == -1.0
    assert math.isclose(wrap_hours(0.5 - 23.5), 1.0)
    assert math.isclose(wrap_hours(13.0 - 12.0), 1.0)


def test_feature_stats_z_is_zero_at_mean_and_scales_with_distance():
    stats = FeatureStats(10.0, 4.0)
    assert stats.z(10.0) == 0.0
    assert math.isclose(stats.z(14.0), 2.0)
    assert math.isclose(stats.z(6.0), -2.0)


def test_feature_stats_learns_towards_observations():
    stats = FeatureStats(0.0, 1.0)
    for _ in range(200):
        stats.update(5.0)
    assert abs(stats.mean - 5.0) < 0.05
    assert stats.var < 0.2


def test_scale_zero_means_no_learning():
    stats = FeatureStats(1.0, 1.0)
    stats.update(100.0, scale=0.0)
    assert stats.mean == 1.0 and stats.n == 0.0


def test_between_variance_decays_with_evidence():
    stats = FeatureStats(0.0, 1.0, between_var=3.0, n0=2.0)
    before = stats.effective_var()
    for _ in range(20):
        stats.update(0.0)
    assert stats.effective_var() < before


def test_inflated_clone_is_more_tolerant():
    stats = FeatureStats(0.0, 1.0)
    clone = stats.clone_inflated(4.0, n0=1.5)
    assert clone.effective_var() > 3.5 * stats.effective_var()
    assert abs(clone.z(2.0)) < abs(stats.z(2.0))


def test_feature_stats_round_trip():
    stats = FeatureStats(2.0, 3.0, 1.0)
    stats.update(2.5)
    again = FeatureStats.from_dict(stats.to_dict())
    assert again.to_dict() == stats.to_dict()


def test_hour_stats_handles_midnight():
    stats = HourStats(23.5, 1.0)
    assert math.isclose(stats.deviation(0.5), 1.0, abs_tol=1e-9)
    assert abs(stats.z(0.5)) < 1.5
    assert abs(stats.z(12.0)) > 5


def test_hour_stats_learns_across_midnight_without_jumping():
    stats = HourStats(23.0, 1.0)
    for hour in (23.5, 0.5, 23.7, 0.2, 0.0) * 10:
        stats.update(hour)
    assert stats.mu > 23.0 or stats.mu < 1.0
    assert stats.var < 2.0


def test_hour_stats_round_trip():
    stats = HourStats(8.0, 2.0, 1.0)
    stats.update(9.0)
    again = HourStats.from_dict(stats.to_dict())
    assert math.isclose(again.mu, stats.mu)
    assert again.to_dict() == stats.to_dict()
