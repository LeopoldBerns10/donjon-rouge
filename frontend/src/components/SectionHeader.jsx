export default function SectionHeader({ title, subtitle }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-cinzel-deco font-bold text-gold-gradient mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-ash text-sm tracking-widest font-cinzel uppercase">{subtitle}</p>
      )}
      <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-crimson to-transparent" />
    </div>
  )
}
