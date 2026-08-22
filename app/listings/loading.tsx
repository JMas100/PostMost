import { Shell } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ListingsLoading() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-44" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platforms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[0, 1, 2].map((i) => (
                  <TableRow key={i} className="opacity-70" style={{ opacity: 1 - i * 0.25 }}>
                    <TableCell>
                      <Skeleton className="h-10 w-10 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
