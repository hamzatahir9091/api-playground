maze_graph = {
    'A': ['B'],
    'B': ['W','C','A'],
    'C': ['B','D'],
    'D': ['C','E'],
    'E': ['D','F','K'],
    'F': ['E','G'],
    'G': ['F','H','J'],
    'H': ['G','I'],
    'I': ['H','L','J'],
    'J': ['G','I'],
    'K': ['E'],

    'T': ['U','S'],
    'U': ['T','V'],
    'V': ['U','W'],
    'W': ['V','B'],

    'S': ['T','R'],
    'R': ['S','Q'],
    'Q': ['R','P'],
    'P': ['Q','O'],
    'O': ['P','N'],

    'N': ['O','M'],
    'M': ['N','L','Z'],
    'L': ['M','I'],

    'X': ['Y'],
    'Y': ['X','Z'],
    'Z': ['Y','M']
}


def depth_limited_dfs(maze_graph, node, target, limit, seen):

    if limit < 0:
        return False

    print(node, end=" ")

    if node == target:
        print("Goal found")
        return True

    seen.add(node)

    for neighbor in maze_graph[node]:
        if neighbor not in seen:
            if depth_limited_dfs(maze_graph, neighbor, target, limit - 1, seen):
                return True

    return False


def iterative_deepening_dfs(maze_graph, start, goal, max_depth):

    if start not in maze_graph:
        print("The node does not exist in the graph")
        return None

    for limit in range(max_depth + 1):

        print(f"\nDepth limit: {limit}")

        seen = set()

        if depth_limited_dfs(maze_graph, start, goal, limit, seen):
            return True

    print("\nGoal not found")
    return False


# Call IDDFS
iterative_deepening_dfs(maze_graph, 'X', 'A', max_depth=15)