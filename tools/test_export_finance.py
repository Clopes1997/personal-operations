import sqlite3
import tempfile
import unittest
from pathlib import Path
from export_finance import export_database, TABLES

class ExportTests(unittest.TestCase):
    def test_read_only_export_preserves_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.sqlite"
            with sqlite3.connect(path) as connection:
                for name in TABLES:
                    connection.execute(f'CREATE TABLE "{name}" (id INTEGER, amount REAL)')
                connection.execute("INSERT INTO Meses VALUES (1, 12.34)")
            connection.close()
            before = path.read_bytes()
            result = export_database(path)
            self.assertEqual(result["tables"]["Meses"][0]["amount"], "12.34")
            self.assertEqual(path.read_bytes(), before)

    def test_missing_source_is_not_created(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "missing.sqlite"
            with self.assertRaises(FileNotFoundError):
                export_database(path)
            self.assertFalse(path.exists())

if __name__ == "__main__":
    unittest.main()
