def sum_of_squares(n):
    """1² + 2² + ... + n²."""
    total = 0
    for k in range(1, n + 1):
        total = total + k**2
    return total

print(sum_of_squares(3))     # 1 + 4 + 9
print(sum_of_squares(100))
