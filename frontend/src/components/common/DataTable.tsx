import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  emptyMessage?: string;
}

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = 'Không có dữ liệu phù hợp.',
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="bg-slate-50/90 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider"
            >
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="py-3.5 px-4 whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-3.5 px-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
