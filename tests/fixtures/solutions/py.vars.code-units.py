speed_kmh = 90
journey_minutes = 135

speed_ms = speed_kmh / 3.6   # the speed in metres per second
hours = journey_minutes // 60      # whole hours in the journey
minutes = journey_minutes % 60    # minutes left over

print(speed_kmh, "km/h is", speed_ms, "m/s")
print(journey_minutes, "minutes is", hours, "h", minutes, "min")
