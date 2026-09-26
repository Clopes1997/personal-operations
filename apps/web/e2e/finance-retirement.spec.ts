import {test,expect} from "@playwright/test";
import {readFile,writeFile} from "node:fs/promises";
test("real-source acceptance: finance export reconciles before backup rehearsal",async({page},info)=>{
 test.skip(!process.env.FINANCE_SOURCE_EXPORT,"Explicit private export required");
 const path=process.env.FINANCE_SOURCE_EXPORT!;
 const currency=process.env.FINANCE_SOURCE_CURRENCY!;
 const installation=process.env.FINANCE_SOURCE_INSTALLATION!;
 const raw=await readFile(path,"utf8"),source=JSON.parse(raw);
 const key=(type:string,id:unknown)=>"finance-tacker:"+installation+":"+type+":"+id;
 const cents=(value:unknown)=>{
  const text=String(value),sign=text.startsWith("-")?-1:1,positive=text.replace(/^-/,"");
  if(!/^\d+(\.\d{1,2})?$/.test(positive))throw new Error("Unsupported source precision");
  const [whole,fraction=""]=positive.split(".");
  const number=Number(BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0")))*sign;
  if(!Number.isSafeInteger(number))throw new Error("Unsafe source amount");return number;
 };
 await page.goto("/");
 await page.getByRole("button",{name:"Backups",exact:true}).click();
 await page.getByLabel("Source application").selectOption("finance-tacker");
 await page.getByLabel("Source installation ID").fill(installation);
 await page.getByLabel("Confirmed finance currency").fill(currency);
 await page.getByLabel("Legacy JSON export").setInputFiles(path);
 await page.getByLabel("I reviewed the mappings and warnings.").check();
 await page.getByRole("button",{name:"Apply reviewed legacy import"}).click();
 await expect(page.getByRole("button",{name:"Apply reviewed legacy import"})).toBeHidden();
 const pending=page.waitForEvent("download");
 await page.getByRole("button",{name:"Export all data",exact:true}).click();
 const saved=info.outputPath("imported-backup.json");await (await pending).saveAs(saved);
 const snapshot=JSON.parse(await readFile(saved,"utf8"));
 expect(snapshot.archives).toHaveLength(1);
 expect(snapshot.archives[0]).toMatchObject({id:"finance-tacker:"+installation,source:"finance-tacker",raw});
 expect(snapshot.templates).toHaveLength(source.tables.ExpenseTemplates.length);
 for(const template of source.tables.ExpenseTemplates){
  expect(snapshot.templates.find((row:{id:string})=>row.id===key("template",template.id))).toEqual({
   id:key("template",template.id),title:template.nome,category:template.categoria,
   cents:template.valor_padrao===null?0:cents(template.valor_padrao),variable:template.valor_padrao===null,active:template.ativa===1
  });
 }
 expect(snapshot.budgets).toHaveLength(source.tables.Meses.length);
 for(const month of source.tables.Meses){
  const mapped=snapshot.budgets.find((row:{id:string})=>row.id===key("month",month.id));
  expect(mapped).toMatchObject({month:month.mes,currency,salary:cents(month.salario),benefits:cents(month.vr),
   rate:cents(month.percentual_aporte),contribution:cents(month.valor_aporte),free:cents(month.dinheiro_livre),legacy:true});
  const expenses=source.tables.MonthExpenses.filter((row:{month_id:unknown})=>String(row.month_id)===String(month.id));
  expect(mapped.expenses).toHaveLength(expenses.length);
  for(const expense of expenses)expect(mapped.expenses.find((row:{id:string})=>row.id===key("expense",expense.id))).toEqual({
   id:key("expense",expense.id),title:expense.nome,category:expense.categoria,cents:cents(expense.valor)
  });
  expect(mapped.salary+mapped.benefits).toBe(cents(month.receita_total));
  const total=mapped.expenses.reduce((n:number,row:{cents:number})=>n+row.cents,0);
  expect(total).toBe(cents(month.gastos_obrigatorios));
  expect(mapped.salary+mapped.benefits-mapped.contribution-total).toBe(mapped.free);
 }
 await page.getByRole("button",{name:"Legacy History",exact:true}).click();
 await expect(page.getByRole("heading",{name:"finance-tacker:"+installation,exact:true})).toBeVisible();
 await writeFile(process.env.FINANCE_IMPORT_RESULT!,JSON.stringify(snapshot,null,2),{flag:"wx"});
});

