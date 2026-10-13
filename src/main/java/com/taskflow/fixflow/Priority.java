package com.taskflow.fixflow;
public enum Priority {
    LOW(72), MEDIUM(24), HIGH(4), CRITICAL(2);
    public final int hours;
    Priority(int hours) { this.hours=hours; }
}
