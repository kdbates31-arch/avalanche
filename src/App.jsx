export default function RoofingAgencyCRM() {
  const contacts = [
    {
      agency: 'State Farm - Westlake',
      agent: 'Sarah Johnson',
      phone: '(512) 555-0181',
      email: 'sarah@agency.com',
      status: 'Warm Relationship',
      lastContact: '2026-05-10',
      notes: 'Wants faster roof inspections and photos within 24 hours.'
    },
    {
      agency: 'Allstate - Austin North',
      agent: 'Mike Ramirez',
      phone: '(512) 555-0147',
      email: 'mike@allstate.com',
      status: 'Needs Follow Up',
      lastContact: '2026-04-28',
      notes: 'Send storm damage checklist and referral program details.'
    },
    {
      agency: 'Farmers Insurance',
      agent: 'Emily Carter',
      phone: '(512) 555-0175',
      email: 'emily@farmers.com',
      status: 'Active Referrals',
      lastContact: '2026-05-20',
      notes: 'Already referred 3 homeowners this month.'
    }
  ];

  const tasks = [
    'Call 5 new insurance agencies this week',
    'Drop off business cards and referral packets',
    'Follow up after major storms within 24 hours',
    'Track which agents send the most referrals'
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h1 className="text-4xl font-bold mb-2">Roofing Insurance Referral CRM</h1>
          <p className="text-gray-600 text-lg">
            Manage insurance agency relationships and increase claim referrals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-gray-500">Total Agencies</p>
            <h2 className="text-3xl font-bold">24</h2>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-gray-500">Active Referrals</p>
            <h2 className="text-3xl font-bold">9</h2>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-gray-500">Follow Ups Due</p>
            <h2 className="text-3xl font-bold">6</h2>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-gray-500">Monthly Claims</p>
            <h2 className="text-3xl font-bold">17</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Insurance Agency Contacts</h2>
              <button className="bg-black text-white px-4 py-2 rounded-xl hover:opacity-90">
                Add Contact
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-3">Agency</th>
                    <th className="py-3">Agent</th>
                    <th className="py-3">Contact</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Last Contact</th>
                  </tr>
                </thead>

                <tbody>
                  {contacts.map((contact, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-4 font-medium">{contact.agency}</td>
                      <td className="py-4">{contact.agent}</td>
                      <td className="py-4">
                        <div>{contact.phone}</div>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                      </td>
                      <td className="py-4">
                        <span className="bg-gray-200 px-3 py-1 rounded-full text-sm">
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-4">{contact.lastContact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Relationship Strategy</h2>

              <div className="space-y-4 text-gray-700">
                <div className="p-4 bg-gray-100 rounded-2xl">
                  <p className="font-semibold">Primary Goal</p>
                  <p>
                    Become the roofing company agents trust first when homeowners call about storm damage.
                  </p>
                </div>

                <div className="p-4 bg-gray-100 rounded-2xl">
                  <p className="font-semibold">Best Tactics</p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Fast inspections</li>
                    <li>Clean photo documentation</li>
                    <li>Zero-pressure communication</li>
                    <li>Quick claim assistance</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Weekly Tasks</h2>

              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-100 p-3 rounded-2xl">
                    <input type="checkbox" className="mt-1" />
                    <p>{task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Notes Template For Each Agent</h2>

          <div className="bg-gray-100 rounded-2xl p-5 text-gray-700 whitespace-pre-line">
{`• Birthday or personal details
• How many claims they handle monthly
• Preferred communication style
• Referral history
• Response time expectations
• Favorite adjusters to work with
• Whether they like text, phone, or email
• Last lunch / coffee meeting
• Storm follow up status`}
          </div>
        </div>
      </div>
    </div>
  );
}
