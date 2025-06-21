import React from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table';

// Example columns for files/folders
const defaultColumns = [
  {
    accessorKey: 'icon',
    header: '',
    cell: info => <span style={{fontSize:'1.3rem'}}>{info.getValue()}</span>,
    size: 40,
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: info => <span title={info.getValue()} style={{fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',display:'block'}}>{info.getValue()}</span>,
    minSize: 200,
    size: 240,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: info => info.getValue(),
    size: 120,
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: info => info.getValue(),
    size: 100,
  },
  {
    accessorKey: 'date',
    header: 'Date Modified',
    cell: info => info.getValue(),
    size: 140,
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    cell: () => null,
    size: 80,
    enableSorting: false,
  },
];

export default function FileExplorerGrid({ data, columns = defaultColumns, onRowClick, onAddToComparison, globalFilter, setGlobalFilter }) {
  const [sorting, setSorting] = React.useState([]);

  // If onAddToComparison is provided, override the Actions column
  const enhancedColumns = React.useMemo(() => {
    if (!onAddToComparison) return columns;
    return columns.map(col => {
      if (col.accessorKey !== 'actions') return col;
      return {
        ...col,
        cell: info => {
          const row = info.row.original;
          if (row.folder) {
            return (
              <button
                style={{background:'#22c55e',color:'#fff',border:'none',borderRadius:6,padding:'0.3rem 0.7rem',fontWeight:700,cursor:'pointer'}}
                title="Add to comparison"
                onClick={e => {
                  e.stopPropagation();
                  onAddToComparison(row);
                }}
              >
                +
              </button>
            );
          }
          return null;
        }
      };
    });
  }, [columns, onAddToComparison]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: false,
  });

  return (
    <div style={{overflowX:'auto',background:'#fff',borderRadius:10,boxShadow:'0 2px 12px rgba(0,0,0,0.04)',margin:'2rem 0'}}>
      <table style={{width:'100%',borderCollapse:'separate',borderSpacing:0,minWidth:700}}>
        <thead style={{background:'#f8f9fa'}}>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id} 
                  style={{
                    padding:'0.75rem 1rem',
                    fontWeight:600,
                    textAlign:'left',
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none',
                    position:header.column.columnDef.sticky?'sticky':'static',
                    left:header.column.columnDef.sticky?0:undefined,
                    background:header.column.columnDef.sticky?'#fff':'#f8f9fa',
                    zIndex:header.column.columnDef.sticky?2:1,
                    minWidth:header.column.columnDef.minSize||header.column.columnDef.size,
                    maxWidth:header.column.columnDef.size
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' 🔼',
                    desc: ' 🔽',
                  }[header.column.getIsSorted()] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              style={{
                background:row.index%2?'#f8fafd':'#fff',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onMouseOver={e => { if (onRowClick) e.currentTarget.style.background = '#eaf3fb'; }}
              onMouseOut={e => { if (onRowClick) e.currentTarget.style.background = row.index%2?'#f8fafd':'#fff'; }}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} style={{padding:'0.75rem 1rem',verticalAlign:'middle',position:cell.column.columnDef.sticky?'sticky':'static',left:cell.column.columnDef.sticky?0:undefined,background:cell.column.columnDef.sticky?'#fff':'inherit',zIndex:cell.column.columnDef.sticky?1:0,minWidth:cell.column.columnDef.minSize||cell.column.columnDef.size,maxWidth:cell.column.columnDef.size,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
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