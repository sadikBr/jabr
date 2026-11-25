def mean(values):
    """The average of a list of numbers."""
    total = 0
    for value in values:
        total = total + value
    return total / len(values)

times = [9.58, 9.63, 9.69, 9.72, 9.74]
print("Mean time:", mean(times), "s")
