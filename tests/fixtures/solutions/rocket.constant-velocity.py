def simulate(v, dt, steps):
    """Positions of a point moving at constant velocity v.

    Returns a list that starts at 0 and has one more entry per time step.
    """
    x = 0.0
    positions = [x]
    for _ in range(steps):
        x += v * dt
        positions.append(x)
    return positions

# Four steps of half a second at 3 m/s.
print(simulate(v=3.0, dt=0.5, steps=4))
