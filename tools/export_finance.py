"""Read-only, consistent SQLite export. Never initializes or migrates the source database."""
import argparse
import json
import math
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

TABLES = ("Config", "ExpenseTemplates", "Meses", "MonthExpenses", "Eventos")

def export_database(path):
    source = Path(path).resolve(strict=True)
    connection = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA query_only = ON")
        connection.execute("BEGIN")
        tables = {}
        for name in TABLES:
            rows = []
            for row in connection.execute('SELECT * FROM "' + name + '"'):
                record = dict(row)
                for key, value in record.items():
                    if isinstance(value, float):
                        if not math.isfinite(value):
                            raise ValueError(f"Non-finite numeric value in {name}.{key}")
                        # Preserve REAL's shortest decimal representation; the importer rejects excess precision.
                        record[key] = str(value)
                rows.append(record)
            tables[name] = rows
        return {"version": 1, "source": "finance-tacker",
                "exportedAt": datetime.now(timezone.utc).isoformat(),
                "rowCounts": {name: len(rows) for name, rows in tables.items()},
                "tables": tables}
    finally:
        connection.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = export_database(args.database)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2, allow_nan=False)
    print("Exported row counts:", result["rowCounts"])

if __name__ == "__main__":
    main()
