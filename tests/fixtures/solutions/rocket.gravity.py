G = 9.81  # m/s², downwards

def exact_height(y0, v0, t):
    """Height at time t for an object that started at y0 moving up at v0."""
    return y0 + v0 * t - 0.5 * G * t**2

def fall(y0, v0, dt, t_end):
    """The same motion, found step by step with Euler's method.

    Returns (times, heights).
    """
    steps = round(t_end / dt)
    t, y, v = 0.0, y0, v0
    times, heights = [t], [y]
    for _ in range(steps):
        y += v * dt
        v -= G * dt
        t += dt
        times.append(t)
        heights.append(y)
    return times, heights

# Drop from 100 m and compare with the exact answer after 3 seconds.
for dt in [0.5, 0.1, 0.01]:
    times, heights = fall(y0=100.0, v0=0.0, dt=dt, t_end=3.0)
    print(f"dt = {dt:<5} Euler: {heights[-1]:7.3f} m   exact: {exact_height(100.0, 0.0, 3.0):7.3f} m")
