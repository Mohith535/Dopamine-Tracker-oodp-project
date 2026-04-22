/*
 * Digital Habit & Dopamine Tracker System
 * Calendar-Based Behavioral Tracker
 * ─────────────────────────────────────────
 * OOP Concepts:
 *   Abstraction   → Habit (abstract base class)
 *   Inheritance   → GoodHabit, BadHabit
 *   Polymorphism  → virtual getScore(), getType()
 *   Encapsulation → private data with public accessors
 *
 * Note: BadHabit class exists to demonstrate OOP.
 *       The program flow focuses on good habits only.
 */

#include <iostream>
#include <string>
#include <vector>
#include <map>
using namespace std;

// ──────────────────────────────────────────
// Abstract Base Class: Habit
// Demonstrates: Abstraction & Encapsulation
// ──────────────────────────────────────────
class Habit {
private:
    string name;

public:
    Habit(string n) : name(n) {}
    virtual ~Habit() {}

    string getName() const { return name; }

    // Pure virtual — abstraction
    virtual int getScore() const = 0;
    virtual string getType() const = 0;

    void display() const {
        cout << "  [" << getType() << "] " << name
             << " (" << getScore() << " pts)" << endl;
    }
};

// ──────────────────────────────────────────
// Derived Class: GoodHabit (+10 points)
// Demonstrates: Inheritance & Polymorphism
// ──────────────────────────────────────────
class GoodHabit : public Habit {
public:
    GoodHabit(string n) : Habit(n) {}

    int getScore() const override { return 10; }
    string getType() const override { return "GOOD"; }
};

// ──────────────────────────────────────────
// Derived Class: BadHabit (-8 points)
// Exists to demonstrate OOP inheritance
// ──────────────────────────────────────────
class BadHabit : public Habit {
public:
    BadHabit(string n) : Habit(n) {}

    int getScore() const override { return -8; }
    string getType() const override { return "BAD"; }
};

// ──────────────────────────────────────────
// Tracker Class — Core Logic Engine
// Demonstrates: Encapsulation
// ──────────────────────────────────────────
class Tracker {
private:
    vector<Habit*> habits;

    // date → which habits were completed (by index)
    // e.g., "2026-04-21" → {true, false, true}
    map<string, vector<bool>> dailyRecords;

public:
    ~Tracker() {
        for (Habit* h : habits)
            delete h;
    }

    void addHabit(Habit* h) {
        habits.push_back(h);
        cout << "\n  + Added: " << h->getName() << endl;
    }

    void showHabits() const {
        if (habits.empty()) {
            cout << "\n  No habits added yet." << endl;
            return;
        }
        cout << "\n  Your Habits:" << endl;
        cout << "  ────────────" << endl;
        for (int i = 0; i < (int)habits.size(); i++) {
            cout << "  " << (i + 1) << ". ";
            habits[i]->display();
        }
    }

    // Mark habits for a specific date
    void markDate(const string& date) {
        if (habits.empty()) {
            cout << "\n  Add habits first!" << endl;
            return;
        }

        cout << "\n  Marking habits for: " << date << endl;
        cout << "  (1 = Done, 0 = Missed)" << endl;

        vector<bool> record(habits.size(), false);

        for (int i = 0; i < (int)habits.size(); i++) {
            int done;
            cout << "  " << habits[i]->getName() << "? (1/0): ";
            cin >> done;
            record[i] = (done == 1);
        }

        dailyRecords[date] = record;
        cout << "\n  ✓ Saved for " << date << endl;
    }

    // Calculate score for a specific date
    int getDateScore(const string& date) const {
        auto it = dailyRecords.find(date);
        if (it == dailyRecords.end()) return 0;

        int score = 0;
        const vector<bool>& rec = it->second;
        for (int i = 0; i < (int)rec.size() && i < (int)habits.size(); i++) {
            if (rec[i])
                score += habits[i]->getScore(); // Polymorphic call
        }
        return score;
    }

    // Show consistency per habit (across all recorded days)
    void showConsistency() const {
        if (dailyRecords.empty()) {
            cout << "\n  No records yet." << endl;
            return;
        }

        int totalDays = (int)dailyRecords.size();
        cout << "\n  Habit Consistency (" << totalDays << " days tracked):" << endl;
        cout << "  ───────────────────────────────────" << endl;

        for (int i = 0; i < (int)habits.size(); i++) {
            int completed = 0;
            for (auto& pair : dailyRecords) {
                if (i < (int)pair.second.size() && pair.second[i])
                    completed++;
            }
            int pct = (completed * 100) / totalDays;
            cout << "  " << habits[i]->getName()
                 << " → " << pct << "% (" << completed
                 << "/" << totalDays << ")" << endl;
        }
    }

    // Show score history as ASCII graph
    void showGraph() const {
        if (dailyRecords.empty()) {
            cout << "\n  No data to graph." << endl;
            return;
        }

        cout << "\n  ┌──────────────────────────────────┐" << endl;
        cout << "  │       SCORE HISTORY GRAPH         │" << endl;
        cout << "  └──────────────────────────────────┘" << endl;

        for (auto& pair : dailyRecords) {
            int score = getDateScore(pair.first);
            int bars = (score > 0) ? score / 5 : 0;

            cout << "  " << pair.first << ": ";
            for (int j = 0; j < bars; j++) cout << "#";
            cout << " (" << score << ")" << endl;
        }
    }

    // Feedback based on score
    static string getFeedback(int score) {
        if (score >= 50)
            return "Excellent discipline! Keep going!";
        else if (score >= 20)
            return "Good effort. Stay consistent!";
        else
            return "Low activity. Try to do more tomorrow!";
    }

    int habitCount() const { return (int)habits.size(); }
};

// ──────────────────────────────────────────
// Main Program
// ──────────────────────────────────────────
int main() {
    Tracker tracker;
    string userName;
    int choice;

    cout << endl;
    cout << "  ╔═══════════════════════════════════════╗" << endl;
    cout << "  ║  DIGITAL HABIT & DOPAMINE TRACKER     ║" << endl;
    cout << "  ║  Calendar-Based Behavioral System     ║" << endl;
    cout << "  ╚═══════════════════════════════════════╝" << endl;

    cout << "\n  Enter your name: ";
    getline(cin, userName);
    cout << "\n  Welcome, " << userName << "!\n";

    while (true) {
        cout << "\n  ════════════════════════════════" << endl;
        cout << "  1. Add Habit" << endl;
        cout << "  2. Mark Habits for a Date" << endl;
        cout << "  3. View Date Score" << endl;
        cout << "  4. View Consistency" << endl;
        cout << "  5. View Graph" << endl;
        cout << "  6. Exit" << endl;
        cout << "\n  Choose (1-6): ";
        cin >> choice;
        cin.ignore();

        if (choice == 1) {
            string name;
            cout << "\n  Habit name: ";
            getline(cin, name);
            tracker.addHabit(new GoodHabit(name));

        } else if (choice == 2) {
            string date;
            cout << "\n  Enter date (YYYY-MM-DD): ";
            getline(cin, date);
            tracker.markDate(date);

            int score = tracker.getDateScore(date);
            cout << "\n  Score for " << date << ": " << score << endl;
            cout << "  " << Tracker::getFeedback(score) << endl;

        } else if (choice == 3) {
            string date;
            cout << "\n  Enter date (YYYY-MM-DD): ";
            getline(cin, date);
            int score = tracker.getDateScore(date);
            cout << "\n  Score: " << score << endl;
            cout << "  " << Tracker::getFeedback(score) << endl;

        } else if (choice == 4) {
            tracker.showConsistency();

        } else if (choice == 5) {
            tracker.showGraph();

        } else if (choice == 6) {
            cout << "\n  Stay disciplined, " << userName << "! Goodbye.\n" << endl;
            break;

        } else {
            cout << "  Invalid option." << endl;
        }
    }

    return 0;
}
