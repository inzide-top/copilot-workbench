import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

export function TextareaField(props: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Textarea className={props.className} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

export function Insight(props: { text: string }) {
  return <div className="rounded-md border bg-muted/35 p-3 text-sm text-muted-foreground">{props.text}</div>;
}
