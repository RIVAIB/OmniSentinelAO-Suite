import type { Metadata } from 'next';
import OfficeEditor from '@/components/virtual-office/OfficeEditor';

export const metadata: Metadata = {
    title: 'Office Editor | RIVAIB Mission Control',
    description: 'Drag & drop isometric office layout editor',
};

export default function OfficeEditorPage() {
    return (
        <div className="min-h-screen bg-slate-900">
            <OfficeEditor />
        </div>
    );
}
