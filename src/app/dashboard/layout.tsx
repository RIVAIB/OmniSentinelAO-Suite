// AppLayoutWrapper (root layout) already provides the Sidebar for all routes.
// This segment layout only needs to pass children through.
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
