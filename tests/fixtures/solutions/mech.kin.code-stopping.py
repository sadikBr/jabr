def stopping_distance(speed_kmh, reaction_time=1.0, deceleration=7.0):
    """Thinking distance plus braking distance, in metres."""
    speed = speed_kmh / 3.6  # metres per second
    thinking = speed * reaction_time
    braking = speed**2 / (2 * deceleration)
    return thinking + braking

print("speed    stopping distance")
for speed_kmh in range(30, 140, 10):
    print(f"{speed_kmh:>3} km/h  {stopping_distance(speed_kmh):6.1f} m")
