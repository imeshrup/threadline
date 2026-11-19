import useFetch from '../../lib/useFetch';
import { api } from '../../lib/api';
import { date, money } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Spinner } from '../../components/ui';

export default function Users() {
  const { data, loading, error, reload } = useFetch('/users');
  const { user: me } = useAuth();
  const toast = useToast();

  const run = async (fn, msg) => {
    try { await fn(); toast(msg); reload(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <>
      <h1>Customers</h1>
      <Alert>{error}</Alert>
      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Spent</th><th>Role</th><th /></tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{date(u.createdAt)}</td>
                  <td>{u.orders}</td>
                  <td>{money(u.spent)}</td>
                  <td>{u.isAdmin ? <span className="badge badge-shipped">admin</span> : 'customer'}</td>
                  <td className="actions">
                    {u._id !== me._id && (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => run(() => api(`/users/${u._id}`, { method: 'PUT', body: { isAdmin: !u.isAdmin } }), 'Role updated')}>
                          {u.isAdmin ? 'Revoke admin' : 'Make admin'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Delete ${u.name}?`) && run(() => api(`/users/${u._id}`, { method: 'DELETE' }), 'User deleted')}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
