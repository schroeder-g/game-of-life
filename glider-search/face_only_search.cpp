#include <iostream>
#include <vector>
#include <set>
#include <string>
#include <algorithm>
#include <cstdlib>
#include <ctime>

using namespace std;

struct Cell { int x, y, z; };

Cell makeCell(int x, int y, int z) {
    Cell c; c.x = x; c.y = y; c.z = z; return c;
}

string norm(const vector<Cell>& cells) {
    if(cells.empty()) return "";
    int mx=cells[0].x, my=cells[0].y, mz=cells[0].z;
    for(size_t i=0; i<cells.size(); ++i) {
        mx = min(mx, cells[i].x); my = min(my, cells[i].y); mz = min(mz, cells[i].z);
    }
    vector<Cell> n = cells;
    for(size_t i=0; i<n.size(); ++i) { n[i].x-=mx; n[i].y-=my; n[i].z-=mz; }
    sort(n.begin(), n.end(), [](const Cell& a, const Cell& b) {
        if(a.x != b.x) return a.x < b.x;
        if(a.y != b.y) return a.y < b.y;
        return a.z < b.z;
    });
    string res = "";
    for(size_t i=0; i<n.size(); ++i) {
        res += std::to_string(n[i].x) + "," + std::to_string(n[i].y) + "," + std::to_string(n[i].z) + "|";
    }
    return res;
}

set<string> forbidden;

const int S = 16; 
unsigned char grid[S*S*S];
unsigned char nextGrid[S*S*S];

inline int idx(int x, int y, int z) { return z*S*S + y*S + x; }

// Updated for 6-neighbor (Faces only)
int fastTick(int sMin, int sMax, int bMin, int bMax) {
    std::fill(nextGrid, nextGrid + S*S*S, (unsigned char)0);
    int aliveCount = 0;
    
    for(int z=1; z<S-1; ++z) {
        for(int y=1; y<S-1; ++y) {
            for(int x=1; x<S-1; ++x) {
                int n = 0;
                // Von Neumann neighborhood (6 neighbors)
                if(grid[idx(x+1, y, z)]) ++n;
                if(grid[idx(x-1, y, z)]) ++n;
                if(grid[idx(x, y+1, z)]) ++n;
                if(grid[idx(x, y-1, z)]) ++n;
                if(grid[idx(x, y, z+1)]) ++n;
                if(grid[idx(x, y, z-1)]) ++n;
                
                if(grid[idx(x,y,z)]) {
                    if(n >= sMin && n <= sMax) { nextGrid[idx(x,y,z)]=1; ++aliveCount; }
                } else {
                    if(n >= bMin && n <= bMax) { nextGrid[idx(x,y,z)]=1; ++aliveCount; }
                }
            }
        }
    }
    std::copy(nextGrid, nextGrid + S*S*S, grid);
    return aliveCount;
}

vector<Cell> getCells() {
    vector<Cell> out;
    for(int z=0; z<S; ++z)
        for(int y=0; y<S; ++y)
            for(int x=0; x<S; ++x)
                if(grid[idx(x,y,z)]) {
                    Cell c; c.x = x; c.y = y; c.z = z;
                    out.push_back(c);
                }
    return out;
}

bool getBB(const vector<Cell>& cells, int& mx, int& my, int& mz) {
    if(cells.empty()) return false;
    mx=cells[0].x; my=cells[0].y; mz=cells[0].z;
    for(size_t i=0; i<cells.size(); ++i) {
        mx = min(mx, cells[i].x); my = min(my, cells[i].y); mz = min(mz, cells[i].z);
    }
    return true;
}

int main() {
    srand(time(NULL));
    
    cout << "Face-Only (6-neighbor) 3D spaceship search..." << endl;
    
    // Survival/Birth max 6.
    // Random rules for 6-neighborhood.
    
    long long attempts = 0;
    while(attempts < 50000000) { 
        attempts++;
        if(attempts % 2000000 == 0) {
            cout << attempts/1000000 << "M attempts..." << endl;
            cout.flush();
        }
        
        int sMin = rand() % 4;
        int sMax = sMin + (rand() % 3);
        int bMin = 1 + (rand() % 4);
        int bMax = bMin + (rand() % 2);
        
        std::fill(grid, grid + S*S*S, (unsigned char)0);
        
        // Try starting with small structures
        int numCells = 4 + (rand() % 8);
        for(int i=0; i<numCells; ++i) {
            grid[idx(6+(rand()%4), 6+(rand()%4), 6+(rand()%4))] = 1;
        }
        
        vector<Cell> initialCells = getCells();
        if(initialCells.size() < 4) continue;
        
        string initialNorm = norm(initialCells);
        int imx, imy, imz;
        if(!getBB(initialCells, imx, imy, imz)) continue;
        
        for(int p=1; p<=10; ++p) { 
            int cnt = fastTick(sMin, sMax, bMin, bMax);
            if(cnt < 3 || cnt > 100) break; 
            
            vector<Cell> curCells = getCells();
            string curNorm = norm(curCells);
            
            if(curNorm == initialNorm) {
                int cmx, cmy, cmz;
                if(!getBB(curCells, cmx, cmy, cmz)) break;
                
                int dx = cmx - imx, dy = cmy - imy, dz = cmz - imz;
                if(dx != 0 || dy != 0 || dz != 0) {
                    cout << "\nFOUND FACE-ONLY SPACESHIP!" << endl;
                    cout << "Rule: [" << sMin << ", " << sMax << ", " << bMin << ", " << bMax << "]" << endl;
                    cout << "Period: " << p << endl;
                    cout << "Delta: " << dx << " " << dy << " " << dz << endl;
                    cout << "Cells: ";
                    for(size_t j=0; j<curCells.size(); ++j) {
                        cout << "[" << curCells[j].x-cmx << "," << curCells[j].y-cmy << "," << curCells[j].z-cmz << "] ";
                    }
                    cout << "\nAttempts: " << attempts << endl;
                    return 0;
                } else {
                    break; 
                }
            }
        }
    }
    cout << "Search complete - no spaceship found." << endl;
    return 0;
}
