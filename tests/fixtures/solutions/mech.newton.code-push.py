def simulate_push(force, mass, push_time, total_time=5.0, dt=0.01):
    """The block's velocity at the end, in m/s."""
    velocity = 0.0
    for step in range(round(total_time / dt)):
        time = step * dt
        acceleration = force / mass if time < push_time else 0
        velocity += acceleration * dt
    return velocity

print(f" 6 N on 2 kg for 2 s: {simulate_push(6, 2, 2):.2f} m/s")
print(f" 6 N on 4 kg for 2 s: {simulate_push(6, 4, 2):.2f} m/s")
print(f"12 N on 4 kg for 2 s: {simulate_push(12, 4, 2):.2f} m/s")
