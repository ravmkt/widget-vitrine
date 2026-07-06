import { useState } from 'react';
import { Link } from 'react-router-dom';

type Story = {
  id: number;
  title: string;
  description: string;
  status: string;
};

const initialStories: Story[] = [
  {
    id: 1,
    title: 'Story de boas-vindas',
    description: 'Um exemplo de story para apresentar o aplicativo.',
    status: 'Rascunho',
  },
  {
    id: 2,
    title: 'Story promocional',
    description: 'Um exemplo de story voltado para divulgação e campanha.',
    status: 'Em andamento',
  },
  {
    id: 3,
    title: 'Story institucional',
    description: 'Um exemplo de story para comunicação da marca.',
    status: 'Finalizado',
  },
];

const StoriesPage = () => {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Rascunho');

  const handleCreateStory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      return;
    }

    const newStory: Story = {
      id: Date.now(),
      title,
      description,
      status,
    };

    setStories((currentStories) => [newStory, ...currentStories]);

    setTitle('');
    setDescription('');
    setStatus('Rascunho');
    setShowForm(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-400">Biblioteca</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Stories
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              to="/"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Voltar
            </Link>

            <button
              type="button"
              onClick={() => setShowForm((currentValue) => !currentValue)}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
            >
              {showForm ? 'Fechar formulário' : 'Novo story'}
            </button>
          </div>
        </header>

        {showForm && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Cadastrar novo story</h2>
              <p className="mt-2 text-sm text-slate-400">
                Preencha os dados abaixo para adicionar um novo story.
              </p>
            </div>

            <form onSubmit={handleCreateStory} className="grid gap-5">
              <div className="grid gap-2">
                <label
                  htmlFor="title"
                  className="text-sm font-medium text-slate-200"
                >
                  Título
                </label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: Story para campanha de lançamento"
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500"
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-slate-200"
                >
                  Descrição
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descreva o objetivo deste story"
                  rows={4}
                  className="resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500"
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="status"
                  className="text-sm font-medium text-slate-200"
                >
                  Status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
                >
                  Salvar story
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="py-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">
              Seus stories
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Aqui você poderá visualizar, criar e organizar seus stories.
            </p>
          </div>

          {stories.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <h3 className="text-xl font-bold">Nenhum story cadastrado</h3>
              <p className="mt-2 text-sm text-slate-400">
                Clique em “Novo story” para cadastrar o primeiro.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {stories.map((story) => (
                <article
                  key={story.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.06]"
                >
                  <div className="mb-4 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                    {story.status}
                  </div>

                  <h3 className="text-xl font-bold">{story.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {story.description}
                  </p>

                  <button
                    type="button"
                    className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Abrir story
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default StoriesPage;
