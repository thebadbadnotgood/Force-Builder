import type { CombatDisciplineDoc, DisciplineBlock } from './combatDisciplines'

function DisciplineBlockView({ block }: { block: DisciplineBlock }) {
  if (block.type === 'heading') {
    return <h4 className="discipline-block__h">{block.text}</h4>
  }
  if (block.type === 'paragraph') {
    return <p className="discipline-block__p">{block.text}</p>
  }
  const [colA, colB] = block.columnHeaders ?? ['Name', 'Effect']
  return (
    <div className="discipline-table-wrap">
      <table className="discipline-table">
        <thead>
          <tr>
            <th scope="col">{colA}</th>
            <th scope="col">{colB}</th>
            {block.showCost ? <th scope="col">Cost</th> : null}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.name}>
              <td className="discipline-table__name">{row.name}</td>
              <td className="discipline-table__effect">{row.effect}</td>
              {block.showCost ? (
                <td className="discipline-table__cost">{row.cost ?? '—'}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CombatDisciplinePanel({
  doc,
}: {
  doc: CombatDisciplineDoc | null
}) {
  if (!doc) {
    return (
      <p className="discipline-panel__empty">
        Choose a combat discipline to see its full rules for this force.
      </p>
    )
  }
  return (
    <div className="discipline-panel">
      {doc.blocks.map((block, i) => (
        <DisciplineBlockView key={i} block={block} />
      ))}
    </div>
  )
}
