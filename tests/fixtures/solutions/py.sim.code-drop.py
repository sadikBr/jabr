def drop(height, total_time, dt=0.01):
    """A dropped ball, step by step. Returns the times and the heights."""
    g = 9.8
    t, y, v = 0.0, height, 0.0
    times, heights = [t], [y]
    for _ in range(round(total_time / dt)):
        a = -g
        v = v + a * dt
        y = y + v * dt
        t = t + dt
        times.append(t)
        heights.append(y)
    return times, heights

times, heights = drop(20, 1.0)
print(f"After {times[-1]:.2f} s the ball is at {heights[-1]:.2f} m")
print("The exact answer is 20 - 4.9 × 1² = 15.10 m")
