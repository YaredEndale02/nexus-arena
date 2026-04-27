import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Trophy } from "lucide-react";
import { Tournament } from "@/lib/api";

export function TournamentTable({ 
  tournaments, 
  onSelect, 
  onDelete 
}: { 
  tournaments: Tournament[], 
  onSelect: (id: string) => void, 
  onDelete: (id: string) => void 
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-md">
      <Table>
        <TableHeader className="bg-black/40">
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="w-[300px]">Tournament</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Format</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((t) => (
            <TableRow key={t.id} className="border-white/10 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onSelect(t.id)}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.gameTitle}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium border border-white/5">
                  {t.displayStatus}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(t.startDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {t.format}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="hover:bg-white/10 text-muted-foreground hover:text-foreground" onClick={() => onSelect(t.id)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-muted-foreground hover:text-red-400" onClick={() => onDelete(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
