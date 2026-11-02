import { useState } from 'react';
import { DARK_WHEN_LIVE, DEFAULT_HR_VIEW } from '../config';
import { INSTRUCTOR } from '../data';
import { useStore } from '../store';
import type { ClassType } from '../types';
import { ClassesPage } from './ClassesPage';
import { ClassPage, type ClassUi } from './ClassPage';
import { SectionModal } from './SectionModal';
import { TypeModal } from './TypeModal';
import './instructor.css';

type Page = { name: 'classes' } | { name: 'class'; code: string };

type ModalState =
  | null
  | { kind: 'type'; type: ClassType | null }
  | { kind: 'newSection'; typeId: string | null }
  | { kind: 'editSection'; code: string };

export function InstructorApp() {
  const store = useStore();
  const [page, setPage] = useState<Page>({ name: 'classes' });
  const [modal, setModal] = useState<ModalState>(null);
  const [ui, setUi] = useState<ClassUi>({ tab: 'hr', view: DEFAULT_HR_VIEW, drafts: {}, dismissed: {}, announcing: false });
  const updateUi = (patch: Partial<ClassUi>) => setUi((prev) => ({ ...prev, ...patch }));

  const section = page.name === 'class' ? store.sectionByCode(page.code) : undefined;
  const dark = DARK_WHEN_LIVE && !!section && ui.tab === 'hr' && store.isLive(section.code);
  const goClasses = () => setPage({ name: 'classes' });
  const closeModal = () => setModal(null);

  return (
    <div className={'instructor' + (dark ? ' instructor--dark' : '')}>
      <div className="i-topbar">
        <button className="i-logo" onClick={goClasses}>
          CCCARE
        </button>
        <span className="i-role-tag">{INSTRUCTOR.credential.toUpperCase()}</span>
        <button className="i-nav-btn" aria-current={page.name === 'classes' ? 'page' : undefined} onClick={goClasses}>
          My classes
        </button>
        <span className="i-user">
          <span className="i-user__avatar">{INSTRUCTOR.initials}</span>
          {INSTRUCTOR.name}
        </span>
      </div>

      {section ? (
        <ClassPage
          section={section}
          ui={ui}
          updateUi={updateUi}
          onBack={goClasses}
          onEdit={() => setModal({ kind: 'editSection', code: section.code })}
        />
      ) : (
        <ClassesPage
          onOpenSection={(code) => {
            setPage({ name: 'class', code });
            updateUi({ tab: 'hr' });
          }}
          onEditType={(type) => setModal({ kind: 'type', type })}
          onNewSection={(typeId) => setModal({ kind: 'newSection', typeId })}
        />
      )}

      {modal?.kind === 'type' && <TypeModal type={modal.type} onClose={closeModal} />}
      {modal?.kind === 'newSection' && <SectionModal mode="create" initialTypeId={modal.typeId} onClose={closeModal} />}
      {modal?.kind === 'editSection' && store.sectionByCode(modal.code) && (
        <SectionModal
          mode="edit"
          section={store.sectionByCode(modal.code)!}
          onClose={closeModal}
          onDeleted={() => {
            closeModal();
            goClasses();
          }}
        />
      )}
    </div>
  );
}
