# StepX Admin Panel

Mfumo wa usimamizi wa duka la viatu vya jumla — uliojengwa kwa Next.js 16 na Supabase.

---

## Maelezo

StepX Admin ni jukwaa la kusimamia biashara ya viatu vya jumla. Inakuwezesha kusimamia bidhaa, maagizo ya wateja, na hesabu za stoki kwa urahisi na kwa haraka.

## Vipengele Vikuu

- **Bidhaa** — Ongeza, hariri, na futa bidhaa. Jaza saizi kwa masafa (mfano 36–45), idadi kwa kila saizi, na bei ya jumla kwa pc moja. Bei ya mfuko mzima inajihesabu yenyewe.
- **Stoki** — Fuatilia saizi na idadi ya viatu vilivyopo dukani kwa wakati halisi.
- **Maagizo** — Angalia na simamia maagizo ya wateja.
- **Wateja** — Orodha ya wateja na historia yao.
- **Picha** — Pakia picha nyingi kwa drag & drop hadi Supabase Storage.
- **Uingiaji Salama** — Uthibitishaji kupitia Supabase Auth.

## Teknolojia Iliyotumika

| Teknolojia | Matumizi |
|---|---|
| [Next.js 16](https://nextjs.org) | Framework ya React (App Router) |
| [Supabase](https://supabase.com) | Database, Auth, na Storage |
| [Tailwind CSS](https://tailwindcss.com) | Muundo na mitindo |
| [shadcn/ui](https://ui.shadcn.com) | Vipengele vya UI |
| [Lucide React](https://lucide.dev) | Aikoni |
| [Sonner](https://sonner.emilkowal.ski) | Arifa (toasts) |

## Jinsi ya Kuendesha Mradi

### 1. Nakili mradi

```bash
git clone https://github.com/FrancHK/stepx.git
cd stepx
```

### 2. Sakinisha vifaa

```bash
npm install
```

### 3. Weka mazingira

Unda faili `.env.local` kwenye mzizi wa mradi na uweke:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Weka Supabase Storage

Nenda kwenye Supabase Dashboard yako, fungua **Storage**, na unda bucket inayoitwa `products` (weka kuwa **Public**).

### 5. Endesha seva ya maendeleo

```bash
npm run dev
```

Fungua [http://localhost:3000](http://localhost:3000) kwenye kivinjari chako.

## Muundo wa Mradi

```
stepx/
├── app/
│   ├── admin/
│   │   ├── dashboard/     # Dashibodi kuu
│   │   ├── products/      # Usimamizi wa bidhaa
│   │   ├── orders/        # Maagizo
│   │   └── customers/     # Wateja
│   └── login/             # Ukurasa wa kuingia
├── components/
│   ├── admin/             # Vipengele vya layout (Sidebar, Navbar)
│   └── ui/                # Vipengele vya msingi (Button, Input, n.k.)
├── lib/
│   ├── supabase.ts        # Muunganiko wa Supabase
│   ├── types.ts           # Aina za TypeScript
│   └── utils.ts           # Zana za msaada
└── public/                # Faili za umma
```

## Kupeleka Mtandaoni (Deploy)

Unaweza kupeleka mradi huu kwa urahisi kupitia [Vercel](https://vercel.com):

1. Ingiza repo yako kwenye Vercel
2. Ongeza `NEXT_PUBLIC_SUPABASE_URL` na `NEXT_PUBLIC_SUPABASE_ANON_KEY` kwenye Environment Variables
3. Deploy

---

Imetengenezwa na **FrancHK** &nbsp;|&nbsp; StepX Wholesale Platform
