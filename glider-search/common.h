#ifndef COMMON_H
#define COMMON_H

#include <vector>
#include <string>
#include <algorithm>
#include <set>

// A simple struct to represent a 3D cell coordinate.
struct Cell {
    int x, y, z;

    // Constructor to replace the old makeCell function.
    Cell(int x_ = 0, int y_ = 0, int z_ = 0) : x(x_), y(y_), z(z_) {}
};

// Calculates the minimum corner of a pattern's bounding box.
inline bool getBB(const std::vector<Cell>& cells, int& min_x, int& min_y, int& min_z) {
    if (cells.empty()) return false;
    min_x = cells[0].x;
    min_y = cells[0].y;
    min_z = cells[0].z;
    for (size_t i = 1; i < cells.size(); ++i) {
        min_x = std::min(min_x, cells[i].x);
        min_y = std::min(min_y, cells[i].y);
        min_z = std::min(min_z, cells[i].z);
    }
    return true;
}

// Creates a canonical string representation of a cell pattern.
inline std::string norm(const std::vector<Cell>& cells) {
    if (cells.empty()) return "";

    int min_x, min_y, min_z;
    getBB(cells, min_x, min_y, min_z);

    std::vector<Cell> n = cells;
    for (size_t i = 0; i < n.size(); ++i) {
        n[i].x -= min_x;
        n[i].y -= min_y;
        n[i].z -= min_z;
    }
    
    std::sort(n.begin(), n.end(), [](const Cell& a, const Cell& b) {
        if (a.x != b.x) return a.x < b.x;
        if (a.y != b.y) return a.y < b.y;
        return a.z < b.z;
    });

    std::string res = "";
    for (size_t i = 0; i < n.size(); ++i) {
        res += std::to_string(n[i].x) + "," + std::to_string(n[i].y) + "," + std::to_string(n[i].z) + "|";
    }
    return res;
}

// Extracts all living cells from a given grid.
inline std::vector<Cell> getCells(const unsigned char* grid, int size) {
    std::vector<Cell> out;
    for (int z = 0; z < size; ++z) {
        for (int y = 0; y < size; ++y) {
            for (int x = 0; x < size; ++x) {
                if (grid[z * size * size + y * size + x]) {
                    out.push_back(Cell(x, y, z));
                }
            }
        }
    }
    return out;
}

#endif // COMMON_H
