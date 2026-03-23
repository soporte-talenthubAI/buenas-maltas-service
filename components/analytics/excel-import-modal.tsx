"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface ImportResult {
  status: "completed" | "error";
  totalRows: number;
  ordersCreated: number;
  ordersSkipped: number;
  ordersFailed: number;
  customersCreated: number;
  customersMatched: number;
  productsCreated: number;
  unmatchedProducts: string[];
  errors: string[];
  duration: number;
}

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExcelImportModal({ open, onClose }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al importar");
      } else {
        setResult(data);
      }
    } catch {
      setError("Error de conexión al servidor");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar Excel
          </CardTitle>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File selector */}
          {!result && (
            <>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-amber-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-black">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click para seleccionar archivo Excel</p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx o .xls</p>
                  </>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Hoja esperada:</strong> &quot;Datos&quot; con columnas de Tango (Fecha, Nro comprobante, Cliente, Artículo, etc.)
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Las facturas ya importadas se detectan automáticamente y no se duplican.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Importando...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-1" /> Importar</>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Results */}
          {result && (
            <>
              <div className="flex items-center gap-2 mb-2">
                {result.status === "completed" ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
                <span className="text-lg font-semibold text-black">
                  {result.status === "completed" ? "Importación completada" : "Importación con errores"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-black">{result.totalRows}</p>
                  <p className="text-xs text-gray-500">Filas procesadas</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.ordersCreated}</p>
                  <p className="text-xs text-gray-500">Facturas creadas</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{result.ordersSkipped}</p>
                  <p className="text-xs text-gray-500">Ya existentes (skip)</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.customersCreated}</p>
                  <p className="text-xs text-gray-500">Clientes nuevos</p>
                </div>
              </div>

              {result.productsCreated > 0 && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-sm text-purple-700">
                    Se crearon <strong>{result.productsCreated}</strong> productos nuevos que no existían en el sistema.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400 text-right">
                Duración: {(result.duration / 1000).toFixed(1)}s
              </p>

              {result.unmatchedProducts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    Productos no encontrados en catálogo ({result.unmatchedProducts.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {result.unmatchedProducts.slice(0, 20).map((p) => (
                      <p key={p} className="text-xs text-yellow-700">{p}</p>
                    ))}
                    {result.unmatchedProducts.length > 20 && (
                      <p className="text-xs text-yellow-600 mt-1">... y {result.unmatchedProducts.length - 20} más</p>
                    )}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Errores ({result.errors.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <p key={i} className="text-xs text-red-700">{e}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
