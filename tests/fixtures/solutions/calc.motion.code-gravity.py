def rates(values, dt):
    """The average rate of change between each value and the next, dt apart."""
    return [(values[i + 1] - values[i]) / dt for i in range(len(values) - 1)]

dt = 0.1  # seconds between readings
heights = [2.000, 1.951, 1.804, 1.559, 1.215, 0.774, 0.234]  # metres

velocities = rates(heights, dt)
accelerations = rates(velocities, dt)
print("velocities (m/s):    ", [round(v, 2) for v in velocities])
print("accelerations (m/s²):", [round(a, 1) for a in accelerations])
