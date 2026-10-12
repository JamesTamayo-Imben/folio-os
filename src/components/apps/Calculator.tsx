"use client";
import { useState } from "react";

function evaluate(expression: string): number {
  const tokens = expression.match(/\d*\.?\d+|[()+\-*/%]/g) ?? [];
  if (tokens.join("") !== expression.replace(/\s+/g, "")) throw new Error("Invalid expression");
  let index = 0;
  const primary = (): number => {
    const token = tokens[index++];
    if (token === "(") {
      const value = sum();
      if (tokens[index++] !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    if (token === "+") return primary();
    if (token === "-") return -primary();
    if (!token || !/^\d*\.?\d+$/.test(token)) throw new Error("Expected a number");
    return Number(token);
  };
  const product = (): number => {
    let value = primary();
    while (["*", "/", "%"].includes(tokens[index] ?? "")) {
      const operator = tokens[index++];
      const right = primary();
      if ((operator === "/" || operator === "%") && right === 0) throw new Error("Cannot divide by zero");
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = product();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const result = sum();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid calculation");
  return result;
}

const KEYS = ["AC", "⌫", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "±", "0", ".", "="];

export function Calculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [error, setError] = useState(false);

  const press = (key: string) => {
    setError(false);
    if (key === "AC") { setExpression(""); setResult("0"); return; }
    if (key === "⌫") { setExpression((current) => current.slice(0, -1)); return; }
    if (key === "±") { setExpression((current) => current.startsWith("-") ? current.slice(1) : `-${current}`); return; }
    if (key === "=") {
      try {
        const value = evaluate(expression.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-"));
        const formatted = Number(value.toPrecision(12)).toString();
        setResult(formatted);
        setExpression(formatted);
      } catch { setError(true); setResult("Error"); }
      return;
    }
    const token = key === "×" ? "×" : key === "÷" ? "÷" : key === "−" ? "−" : key;
    setExpression((current) => current === "Error" ? token : current + token);
  };

  return (
    <div className="calculator-app">
      <div className="calculator-display"><div className="calculator-expression" aria-label="Expression">{expression || "0"}</div><output className={error ? "calculator-result is-error" : "calculator-result"}>{result}</output></div>
      <div className="calculator-keys">{KEYS.map((key) => <button key={key} className={`calculator-key ${["÷", "×", "−", "+", "="].includes(key) ? "operator" : ""} ${key === "AC" ? "utility" : ""} ${key === "=" ? "equals" : ""}`} onClick={() => press(key)} aria-label={key === "⌫" ? "Backspace" : key}>{key}</button>)}</div>
    </div>
  );
}
