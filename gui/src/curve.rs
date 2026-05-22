use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub temp_c: f32,
    pub pwm: u8,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct FanCurve {
    pub points: Vec<Point>,
}

impl FanCurve {
    /// Linear interpolation between the two surrounding points; clamps at both ends.
    pub fn pwm_at(&self, temp_c: f32) -> u8 {
        if self.points.is_empty() {
            return 0;
        }
        let first = &self.points[0];
        let last = self.points.last().unwrap();
        if temp_c <= first.temp_c {
            return first.pwm;
        }
        if temp_c >= last.temp_c {
            return last.pwm;
        }
        for w in self.points.windows(2) {
            let a = &w[0];
            let b = &w[1];
            if temp_c >= a.temp_c && temp_c <= b.temp_c {
                let span = b.temp_c - a.temp_c;
                let t = if span > 0.0 {
                    (temp_c - a.temp_c) / span
                } else {
                    0.0
                };
                let pwm = a.pwm as f32 + (b.pwm as f32 - a.pwm as f32) * t;
                return pwm.round().clamp(0.0, 100.0) as u8;
            }
        }
        last.pwm
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> FanCurve {
        FanCurve {
            points: vec![
                Point { temp_c: 40.0, pwm: 30 },
                Point { temp_c: 80.0, pwm: 80 },
            ],
        }
    }

    #[test]
    fn linear_interpolation_at_midpoint() {
        assert_eq!(sample().pwm_at(60.0), 55);
    }

    #[test]
    fn clamps_below_first_point() {
        assert_eq!(sample().pwm_at(10.0), 30);
    }

    #[test]
    fn clamps_above_last_point() {
        assert_eq!(sample().pwm_at(95.0), 80);
    }

    #[test]
    fn empty_curve_returns_zero() {
        let curve = FanCurve { points: vec![] };
        assert_eq!(curve.pwm_at(50.0), 0);
    }

    #[test]
    fn single_point_returns_that_pwm() {
        let curve = FanCurve {
            points: vec![Point { temp_c: 50.0, pwm: 42 }],
        };
        assert_eq!(curve.pwm_at(20.0), 42);
        assert_eq!(curve.pwm_at(50.0), 42);
        assert_eq!(curve.pwm_at(90.0), 42);
    }
}
