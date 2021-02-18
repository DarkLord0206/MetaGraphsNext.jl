var documenterSearchIndex = {"docs":
[{"location":"#MetaGraphsNext.jl","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.jl","text":"","category":"section"},{"location":"","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.jl","text":"Modules = [MetaGraphsNext]","category":"page"},{"location":"","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.jl","text":"Modules = [MetaGraphsNext]","category":"page"},{"location":"#MetaGraphsNext.DOTFormat","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.DOTFormat","text":"struct DOTFormat <: AbstractGraphFormat end\n\nIf all metadata types support pairs or are nothing, you can save MetaGraphs in DOTFormat.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs\n\njulia> simple = MetaGraph(Graph());\n\njulia> simple[:a] = nothing; simple[:b] = nothing; simple[:a, :b] = nothing;\n\njulia> mktemp() do file, io\n            savegraph(file, simple, DOTFormat())\n            print(read(file, String))\n        end\ngraph T {\n    a\n    b\n    a -- b\n}\n\njulia> complicated = MetaGraph(DiGraph(),\n            VertexMeta = Dict{Symbol, Int},\n            EdgeMeta = Dict{Symbol, Int},\n            gprops = (tagged = true,)\n        );\n\njulia> complicated[:a] = Dict(:code_1 => 1, :code_2 => 2);\n\njulia> complicated[:b] = Dict(:code => 2);\n\njulia> complicated[:a, :b] = Dict(:code => 12);\n\njulia> mktemp() do file, io\n            savegraph(file, complicated, DOTFormat())\n            print(read(file, String))\n        end\ndigraph G {\n    tagged = true\n    a [code_1 = 1, code_2 = 2]\n    b [code = 2]\n    a -> b [code = 12]\n}\n\n\n\n\n\n","category":"type"},{"location":"#MetaGraphsNext.MGFormat","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.MGFormat","text":"struct MGFormat <: AbstractGraphFormat end\n\nYou can save MetaGraphs in a MGFormat, currently based on JLD2.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs: Edge, Graph,  loadgraph, savegraph\n\njulia> example = MetaGraph(Graph());\n\njulia> mktemp() do file, io\n            savegraph(file, example)\n            loadgraph(file, \"something\", MGFormat()) == example\n        end\ntrue\n\n\n\n\n\n","category":"type"},{"location":"#MetaGraphsNext.MetaGraph-Union{Tuple{LightGraphs.AbstractGraph{T}}, Tuple{T}, Tuple{Vertex}} where T where Vertex","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.MetaGraph","text":"MetaGraph(g;\n    Label = Symbol,\n    VertexMeta = nothing,\n    EdgeMeta = nothing,\n    gprops = nothing,\n    weightfunction = eprops -> 1.0,\n    defaultweight = 1.0\n)\n\nConstruct a new meta graph based on g, where Label is the type of the vertex labels, VertexMeta is the type of the metadata at a vertex, and EdgeMeta is the type of the metadata at an edge. You can also attach arbitrary graph level metadata as gprops. It is recommended not to set Label to Int to avoid confusion between vertex labels and codes.\n\njulia> using LightGraphs\n\njulia> using MetaGraphsNext\n\njulia> colors = MetaGraph(Graph(), VertexMeta = String, EdgeMeta = Symbol, gprops = \"special\")\nMeta graph based on a {0, 0} undirected simple Int64 graph with vertices indexed by Symbol(s), String(s) vertex metadata, Symbol(s) edge metadata, \"special\" as graph metadata, and default weight 1.0\n\nUse setindex! to add a new vertex with the given metadata. If a vertex with the given index does not exist, it will be created automatically; otherwise, setindex! will modify the metadata for the existing vertex.\n\njulia> colors[:red] = \"warm\";\n\njulia> colors[:yellow] = \"warm\";\n\njulia> colors[:blue] = \"cool\";\n\nYou can access and change the metadata using indexing: zero arguments for graph metadata, one label for vertex metadata, and two labels for edge metadata.\n\njulia> colors[]\n\"special\"\n\njulia> colors[:blue] = \"very cool\";\n\njulia> colors[:blue]\n\"very cool\"\n\njulia> colors[:red, :yellow] = :orange;\n\njulia> colors[:red, :yellow]\n:orange\n\njulia> haskey(colors, :red, :yellow)\ntrue\n\njulia> haskey(colors, :yellow, :red) # undirected graph, so vertex order doesn't matter\ntrue\n\nYou can delete vertices and edges with delete!.\n\njulia> delete!(colors, :red, :yellow);\n\njulia> delete!(colors, :blue);\n\nYou can use the weightfunction keyword to specify a function which will transform vertex metadata into a weight. This weight must always be the same type as the defaultweight.\n\njulia> weighted = MetaGraph(Graph(), EdgeMeta = Float64, weightfunction = identity);\n\njulia> weighted[:red] = nothing; weighted[:blue] = nothing; weighted[:yellow] = nothing;\n\njulia> weighted[:red, :blue] = 1.0; weighted[:blue, :yellow] = 2.0;\n\njulia> the_weights = LightGraphs.weights(weighted)\nmetaweights\n\njulia> size(the_weights)\n(3, 3)\n\njulia> the_weights[1, 3]\n1.0\n\njulia> diameter(weighted)\n3.0\n\nMetaGraphs inherit many methods from LightGraphs. In general, inherited methods refer to vertices by codes, not labels, for compatibility with AbstractGraph. Vertex codes get reassigned after rem_vertex!, so I recommend using label indexing if possible.\n\njulia> is_directed(colors)\nfalse\n\njulia> nv(zero(colors))\n0\n\njulia> ne(copy(colors))\n0\n\njulia> add_vertex!(colors, :white, \"neutral\")\ntrue\n\njulia> add_edge!(colors, 1, 3, :pink)\ntrue\n\njulia> rem_edge!(colors, 1, 3)\ntrue\n\njulia> rem_vertex!(colors, 3)\ntrue\n\njulia> rem_vertex!(colors, 3)\nfalse\n\njulia> eltype(colors) == Int\ntrue\n\njulia> edgetype(colors) == Edge{Int}\ntrue\n\njulia> vertices(colors)\nBase.OneTo(2)\n\njulia> has_edge(colors, 1, 2)\nfalse\n\njulia> has_vertex(colors, 1)\ntrue\n\njulia> LightGraphs.SimpleGraphs.fadj(colors, 1) == Int[]\ntrue\n\njulia> LightGraphs.SimpleGraphs.badj(colors, 1) == Int[]\ntrue\n\njulia> colors == colors\ntrue\n\njulia> issubset(colors, colors)\ntrue\n\njulia> SimpleGraph(colors)\n{2, 0} undirected simple Int64 graph\n\nYou can seemlessly make MetaGraphs based on DiGraphs as well.\n\njulia> rock_paper_scissors = MetaGraph(DiGraph(), Label = Symbol, EdgeMeta = Symbol);\n\njulia> rock_paper_scissors[:rock] = nothing; rock_paper_scissors[:paper] = nothing; rock_paper_scissors[:scissors] = nothing;\n\njulia> rock_paper_scissors[:rock, :scissors] = :rock_beats_scissors; rock_paper_scissors[:scissors, :paper] = :scissors_beats_paper; rock_paper_scissors[:paper, :rock] = :paper_beats_rock;\n\njulia> is_directed(rock_paper_scissors)\ntrue\n\njulia> haskey(rock_paper_scissors, :scissors, :rock)\nfalse\n\njulia> haskey(reverse(rock_paper_scissors), :scissors, :rock)\ntrue\n\njulia> SimpleDiGraph(rock_paper_scissors)\n{3, 3} directed simple Int64 graph\n\njulia> sub_graph, _ = induced_subgraph(rock_paper_scissors, [1, 3]);\n\njulia> haskey(sub_graph, :rock, :scissors)\ntrue\n\njulia> delete!(rock_paper_scissors, :paper);\n\njulia> rock_paper_scissors[:rock, :scissors]\n:rock_beats_scissors\n\n\n\n\n\n","category":"method"},{"location":"#Base.haskey-Tuple{MetaGraph,Any,Any}","page":"MetaGraphsNext.jl","title":"Base.haskey","text":"haskey(g, :v1, :v2)\n\nDetermine whether a graph g contains an edge from :v1 to :v2. The order of :v1 and :v2 only matters if g is a digraph.\n\njulia> colors = MetaGraph(Graph(), VertexMeta = String, EdgeMeta = Symbol, gprops = \"special\");\n\njulia> colors[:red] = \"warm\"; colors[:blue] = \"cool\"; colors[:red, :blue] = :purple\n:purple\n\njulia> haskey(colors, :red, :blue) && haskey(colors, :blue, :red)\ntrue\n\njulia> haskey(colors, :red, :yellow)\nfalse\n\n\n\n\n\n","category":"method"},{"location":"#Base.haskey-Tuple{MetaGraph,Any}","page":"MetaGraphsNext.jl","title":"Base.haskey","text":"haskey(g, :label)\n\nDetermine whether a graph g contains the vertex :label.\n\njulia> colors = MetaGraph(Graph(), VertexMeta = String, EdgeMeta = Symbol, gprops = \"special\");\n\njulia> colors[:red] = \"warm\";\n\njulia> haskey(colors, :red)\ntrue\n\njulia> haskey(colors, :blue)\nfalse\n\n\n\n\n\n","category":"method"},{"location":"#LightGraphs.SimpleGraphs.add_edge!-Tuple{MetaGraph,Integer,Integer,Any}","page":"MetaGraphsNext.jl","title":"LightGraphs.SimpleGraphs.add_edge!","text":"add_edge!(g, u, v, val)\n\nAdd an edge (u, v) to MetaGraph g having value val.\n\nReturn true if the edge has been added, false otherwise.\n\n\n\n\n\n","category":"method"},{"location":"#LightGraphs.SimpleGraphs.add_vertex!-Tuple{MetaGraph,Any,Any}","page":"MetaGraphsNext.jl","title":"LightGraphs.SimpleGraphs.add_vertex!","text":"add_vertex!(g, label, val)\n\nAdd a vertex to MetaGraph g with label label having value val.\n\nReturn true if the vertex has been added, false otherwise.\n\n\n\n\n\n","category":"method"},{"location":"#MetaGraphsNext.code_for-Tuple{MetaGraph,Any}","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.code_for","text":"code_for(meta::MetaGraph, vertex_label)\n\nFind the code associated with a vertex_label. This can be useful to pass to methods inherited from LightGraphs. Note, however, that vertex codes could be reassigned after vertex deletion.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs: Graph\n\njulia> meta = MetaGraph(Graph());\n\njulia> meta[:a] = nothing\n\njulia> code_for(meta, :a)\n1\n\n\n\n\n\n","category":"method"},{"location":"#MetaGraphsNext.defaultweight-Tuple{MetaGraph}","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.defaultweight","text":"defaultweight(g)\n\nReturn the default weight for metagraph g.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs: Graph\n\njulia> defaultweight(MetaGraph(Graph(), defaultweight = 2))\n2\n\n\n\n\n\n","category":"method"},{"location":"#MetaGraphsNext.label_for-Tuple{MetaGraph,Any}","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.label_for","text":"label_for(meta::MetaGraph, vertex_code)\n\nFind the label associated with a vertex_code. This can be useful to interpret the results of methods inherited from LightGraphs. Note, however, that vertex codes could be reassigned after vertex deletion.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs: Graph\n\njulia> meta = MetaGraph(Graph());\n\njulia> meta[:a] = nothing\n\njulia> label_for(meta, 1)\n:a\n\n\n\n\n\n","category":"method"},{"location":"#MetaGraphsNext.weightfunction-Tuple{MetaGraph}","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.weightfunction","text":"weightfunction(g)\n\nReturn the weight function for metagraph g.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs: Graph\n\njulia> weightfunction(MetaGraph(Graph(), weightfunction = identity))(0)\n0\n\n\n\n\n\n","category":"method"},{"location":"#MetaGraphsNext.weighttype-Union{Tuple{MetaGraph{#s20,#s21,#s22,#s23,#s24,#s25,#s26,Weight} where #s26 where #s25 where #s24 where #s23 where #s22 where #s21 where #s20}, Tuple{Weight}} where Weight","page":"MetaGraphsNext.jl","title":"MetaGraphsNext.weighttype","text":"weighttype(g)\n\nReturn the weight type for metagraph g.\n\njulia> using MetaGraphsNext\n\njulia> using LightGraphs: Graph\n\njulia> weighttype(MetaGraph(Graph(), defaultweight = 1.0))\nFloat64\n\n\n\n\n\n","category":"method"}]
}
