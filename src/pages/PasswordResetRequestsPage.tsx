import React, { useState, useEffect } from 'react';

interface PasswordResetRequest {
  id: number;
  user_id: number;
  username: string;
  email: string | null;
  requested_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by_user_id: number | null;
}

interface PasswordResetRequestsApiResponse {
  requests: PasswordResetRequest[];
}

const PasswordResetRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);

  const fetchRequests = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/admin/api/password-reset-requests');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: PasswordResetRequestsApiResponse = await response.json();
      setRequests(data.requests);
    } catch (error) {
      console.error('Error fetching password reset requests:', error);
      setError('Failed to load password reset requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleGeneratePassword = async (requestId: number, email: string | null, username: string): Promise<void> => {
    if (!email) {
      alert('This user has no email address on file.');
      return;
    }

    setGeneratingFor(requestId);
    try {
      const response = await fetch(`/admin/api/password-reset-requests/${requestId}/generate-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(`Failed to generate password: ${errorText}`);
        setGeneratingFor(null);
        return;
      }

      const data = await response.json();
      const tempPassword = data.temporary_password;

      // Create mailto link with pre-filled message
      const subject = encodeURIComponent('IRIS - Temporary Password');
      const body = encodeURIComponent(
        `Hello ${username},\n\n` +
        `Your temporary password for IRIS has been generated:\n\n` +
        `Username: ${username}\n` +
        `Temporary Password: ${tempPassword}\n\n` +
        `Please log in and change your password as soon as possible.\n\n` +
        `Best regards,\n` +
        `IRIS Administrator`
      );
      const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

      // Open email client
      window.location.href = mailtoLink;

      // Refresh the list
      await fetchRequests();
    } catch (error) {
      console.error('Error generating password:', error);
      alert('Failed to generate temporary password');
    } finally {
      setGeneratingFor(null);
    }
  };

  if (isLoading) {
    return <div>Loading password reset requests...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  const pendingRequests = requests.filter(r => !r.resolved);
  const resolvedRequests = requests.filter(r => r.resolved);

  return (
    <div>
      <h2>Password Reset Requests</h2>

      {pendingRequests.length === 0 && resolvedRequests.length === 0 && (
        <p>No password reset requests.</p>
      )}

      {pendingRequests.length > 0 && (
        <>
          <h3 style={{ marginTop: '20px' }}>Pending Requests ({pendingRequests.length})</h3>
          <table className="striped" style={{ width: '100%' }}>
            <thead>
              <tr style={{ fontWeight: 'bold' }}>
                <td>Username</td>
                <td>Email</td>
                <td>Requested At</td>
                <td>Action</td>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.username}</td>
                  <td>{request.email || <em>No email</em>}</td>
                  <td>{new Date(request.requested_at).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleGeneratePassword(request.id, request.email, request.username)}
                      disabled={generatingFor === request.id || !request.email}
                      title={!request.email ? 'User has no email address' : 'Generate temporary password and send email'}
                    >
                      {generatingFor === request.id ? 'Generating...' : 'Generate & Send Password'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {resolvedRequests.length > 0 && (
        <>
          <h3 style={{ marginTop: '30px', color: '#666' }}>Resolved Requests ({resolvedRequests.length})</h3>
          <table className="striped" style={{ width: '100%', opacity: 0.7 }}>
            <thead>
              <tr style={{ fontWeight: 'bold' }}>
                <td>Username</td>
                <td>Email</td>
                <td>Requested At</td>
                <td>Resolved At</td>
              </tr>
            </thead>
            <tbody>
              {resolvedRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.username}</td>
                  <td>{request.email || <em>No email</em>}</td>
                  <td>{new Date(request.requested_at).toLocaleString()}</td>
                  <td>{request.resolved_at ? new Date(request.resolved_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default PasswordResetRequestsPage;
