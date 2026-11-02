import { Link } from 'react-router-dom';
export default function ProjectPolicyPage({ privacy = false }: { privacy?: boolean }) {
  return <main className="max-w-3xl mx-auto p-8 space-y-6">
    <h1 className="text-3xl font-bold">{privacy ? 'How this project uses your data' : 'Using the BuildEstate demo'}</h1>
    {privacy ? <>
      <p>Account details, password hashes, listing submissions, viewing requests and contact messages are stored to provide the features you use. Administrators can review accounts, listings, appointments and contact inquiries.</p>
      <p>Listing images are uploaded to an external image hosting service. Email delivery uses an external mail provider. AI search can send your search criteria to configured AI and property search providers; avoid including private information in searches.</p>
      <p>Access credentials and basic account information are stored in your browser. Refresh credentials use cookies. Newsletter signup requires a separate email confirmation; opting out does not delete your account or stop appointment messages.</p>
      <p>Contact the project administrator through the contact form for questions about your stored information or account removal.</p>
    </> : <>
      <p>BuildEstate is a demonstration project. Property listings are demo content, and user accounts may belong to real people testing the project.</p>
      <p>Use the project to test listing submission, moderation, search and viewing requests. Do not treat demo listings or AI results as verified offers or use them to arrange payments.</p>
      <p>Submit only information you are allowed to share. Public listings can be reviewed, rejected or archived by administrators. Abuse can result in account suspension or a ban.</p>
    </>}
    <p><Link to="/contact" className="underline">Contact</Link> · <Link to="/" className="underline">Home</Link></p>
  </main>;
}
