times = [0, 1.89, 2.88, 3.78, 4.64, 5.47, 6.29, 7.10, 7.92, 8.75, 9.58]
distances = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

def average_speeds(times, distances):
    """The average speed between each reading and the next one."""
    speeds = []
    for i in range(len(times) - 1):
        speed = (distances[i + 1] - distances[i]) / (times[i + 1] - times[i])
        speeds.append(speed)
    return speeds

speeds = average_speeds(times, distances)
for i, speed in enumerate(speeds):
    print(f"{distances[i]:>3} to {distances[i + 1]:<3} m: {speed:5.2f} m/s")
print(f"Fastest stretch: {max(speeds):.2f} m/s")
