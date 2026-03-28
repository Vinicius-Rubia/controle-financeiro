import { Database, Download, Trash2, Upload } from "lucide-react"
import type { ChangeEvent } from "react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  clearFinanceLocalStorageKeys,
  parseFinanceBackupJson,
  restoreFinanceBackup,
  triggerFinanceBackupDownload,
} from "@/services/localStorage/finance-backup"

export function DadosPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingJson, setPendingJson] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false)

  const handleExport = () => {
    try {
      triggerFinanceBackupDownload()
      toast.success("Arquivo de backup baixado.")
    } catch {
      toast.error("Não foi possível gerar o backup.")
    }
  }

  const handlePickFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      if (!text.trim()) {
        toast.error("Arquivo vazio.")
        return
      }
      setPendingJson(text)
      setConfirmOpen(true)
    }
    reader.onerror = () => {
      toast.error("Não foi possível ler o arquivo.")
    }
    reader.readAsText(file, "utf-8")
  }

  const confirmImport = () => {
    if (!pendingJson) {
      setConfirmOpen(false)
      return
    }
    try {
      const payload = parseFinanceBackupJson(pendingJson)
      restoreFinanceBackup(payload)
      setPendingJson(null)
      setConfirmOpen(false)
      toast.success("Backup restaurado. Recarregando…")
      window.setTimeout(() => {
        window.location.reload()
      }, 400)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível importar."
      toast.error(message)
      setConfirmOpen(false)
      setPendingJson(null)
    }
  }

  const cancelImport = () => {
    setConfirmOpen(false)
    setPendingJson(null)
  }

  const confirmWipeAll = () => {
    try {
      clearFinanceLocalStorageKeys()
      setWipeConfirmOpen(false)
      toast.success("Todos os dados foram apagados. Recarregando…")
      window.setTimeout(() => {
        window.location.reload()
      }, 400)
    } catch {
      toast.error("Não foi possível apagar os dados.")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          Dados locais
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Exporte ou importe tudo que o app guarda neste navegador (contas,
          cartões, lançamentos, categorias, recorrências e parcelamentos). Útil
          para backup, trocar de computador ou manter uma cópia antes de
          atualizar.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="size-4 opacity-80" />
              Exportar backup
            </CardTitle>
            <CardDescription>
              Gera um arquivo JSON com todas as chaves{" "}
              <span className="font-mono text-xs">controle-financeiro.*</span>{" "}
              deste dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Guarde o arquivo em local seguro. Ele contém seus dados financeiros
              em texto (incluindo nomes e valores).
            </p>
          </CardContent>
          <CardFooter>
            <Button type="button" onClick={handleExport}>
              <Download className="size-4" />
              Baixar backup
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="size-4 opacity-80" />
              Importar backup
            </CardTitle>
            <CardDescription>
              Substitui completamente os dados do app neste navegador pelos do
              arquivo escolhido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              A importação apaga os dados atuais do app neste aparelho e aplica
              o backup. Em seguida a página recarrega.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleFileChange}
            />
          </CardContent>
          <CardFooter>
            <Button type="button" variant="secondary" onClick={handlePickFile}>
              <Upload className="size-4" />
              Escolher arquivo…
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-destructive/40 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="size-4 opacity-80" />
              Apagar todos os dados
            </CardTitle>
            <CardDescription>
              Remove do navegador tudo o que o app guarda (
              <span className="font-mono text-xs">controle-financeiro.*</span>
              ), como se fosse uma instalação nova.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Esta ação não pode ser desfeita. Se quiser manter uma cópia,
              exporte um backup antes.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setWipeConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              Apagar tudo e zerar o app
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="border-dashed bg-muted/15">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Database className="size-4 opacity-70" />
            Onde ficam os dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Tudo é armazenado apenas no{" "}
            <strong className="text-foreground font-medium">localStorage</strong>{" "}
            do seu navegador — não há servidor. Se limpar os dados do site ou
            usar outro navegador, use um backup exportado para recuperar.
          </p>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setPendingJson(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir dados locais?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados do Controle Financeiro neste navegador serão
              removidos e substituídos pelo conteúdo do arquivo. Esta ação não
              pode ser desfeita (salvo se você tiver outro backup).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelImport}>Cancelar</AlertDialogCancel>
            <Button type="button" onClick={confirmImport}>
              Importar e recarregar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={wipeConfirmOpen} onOpenChange={setWipeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os dados locais?</AlertDialogTitle>
            <AlertDialogDescription>
              Contas, cartões, lançamentos, categorias, recorrências e
              parcelamentos serão removidos deste navegador. A página será
              recarregada em seguida. Sem backup exportado, não há como
              recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmWipeAll}>
              <Trash2 data-icon="inline-start" />
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
