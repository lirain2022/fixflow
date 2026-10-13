ALTER TABLE ff_entries ADD COLUMN work_hours DECIMAL(6,2);
ALTER TABLE ff_entries ADD COLUMN labor_cost DECIMAL(12,2);
ALTER TABLE ff_entries ADD COLUMN parts_cost DECIMAL(16,2);
ALTER TABLE ff_entries ADD COLUMN total_cost DECIMAL(16,2);
CREATE TABLE ff_repair_parts (
 entry_id BIGINT NOT NULL REFERENCES ff_entries(id),
 line_no INTEGER NOT NULL,
 part_name VARCHAR(120) NOT NULL,
 quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 999),
 unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
 line_total DECIMAL(16,2) NOT NULL CHECK (line_total >= 0),
 PRIMARY KEY (entry_id, line_no)
);
