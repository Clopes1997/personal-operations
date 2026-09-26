"""Create only a synthetic SQLite fixture; refuses to overwrite any path."""
import sqlite3
import sys
from pathlib import Path
path=Path(sys.argv[1])
path.parent.mkdir(parents=True,exist_ok=True)
with path.open("xb"): pass
connection=sqlite3.connect(path)
connection.executescript("""
CREATE TABLE Config (id INTEGER, name TEXT, value TEXT);
CREATE TABLE ExpenseTemplates (id INTEGER, nome TEXT, categoria TEXT, valor_padrao REAL, ativa INTEGER);
CREATE TABLE Meses (id INTEGER, mes TEXT, salario REAL, vr REAL, receita_total REAL, percentual_aporte REAL, valor_aporte REAL, gastos_obrigatorios REAL, dinheiro_livre REAL);
CREATE TABLE MonthExpenses (id INTEGER, month_id INTEGER, nome TEXT, categoria TEXT, valor REAL);
CREATE TABLE Eventos (id INTEGER, description TEXT);
INSERT INTO Config VALUES (1,'synthetic','fixture only');
INSERT INTO ExpenseTemplates VALUES (1,'Synthetic fixed','Fixture',0.29,1),(2,'Synthetic variable','Fixture',NULL,1);
INSERT INTO Meses VALUES (1,'2026-09',100.00,0.00,100.00,50.00,50.00,0.29,49.71);
INSERT INTO MonthExpenses VALUES (1,1,'Synthetic fixed','Fixture',0.29);
INSERT INTO Eventos VALUES (1,'Synthetic archival evidence');
""")
connection.commit()
connection.close()
print("Synthetic finance fixture created")

