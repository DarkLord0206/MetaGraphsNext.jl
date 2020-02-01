module MetaGraphs
using LightGraphs
using JLD2

import Base:
    eltype, show, ==, Pair,
    Tuple, copy, length, size,
    issubset, zero, getindex, delete!, haskey, push!, setindex!

import LightGraphs:
    AbstractGraph, src, dst, edgetype, nv,
    ne, vertices, edges, is_directed,
    add_vertex!, add_edge!, rem_vertex!, rem_edge!,
    has_vertex, has_edge, inneighbors, outneighbors,
    weights, indegree, outdegree, degree,
    induced_subgraph,
    loadgraph, savegraph, AbstractGraphFormat,
    reverse

import LightGraphs.SimpleGraphs:
    AbstractSimpleGraph, SimpleGraph, SimpleDiGraph,
    SimpleEdge, fadj, badj

export
    AbstractMetaGraph,
    MetaGraph,
    MetaDiGraph,
    meta_graph,
    weight_type,
    default_weight,
    weight_function,
    filter_edges,
    filter_vertices,
    MGFormat,
    DOTFormat,
    reverse


abstract type AbstractMetaGraph{Vertex, InnerGraph, AtVertex, AtEdge, GraphMeta, WeightFunction, Weight} <: AbstractGraph{Vertex} end

function show(io::IO, meta::AbstractMetaGraph{<: Any, <: Any, AtVertex, AtEdge, GraphMeta, <: Any, Weight}) where {AtVertex, AtEdge, GraphMeta, Weight}
    print(io, "Meta graph based on a $(meta.inner_graph) with $AtVertex(s) at vertices, $AtEdge(s) at edges, $GraphMeta metadata, $Weight weights, and default weight $(meta.default_weight)")
end

@inline fadj(meta::AbstractMetaGraph, arguments...) =
    fadj(meta.inner_graph, arguments...)
@inline badj(meta::AbstractMetaGraph, arguments...) =
    badj(meta.inner_graph, arguments...)

eltype(meta::AbstractMetaGraph) = eltype(meta.inner_graph)
edgetype(meta::AbstractMetaGraph) = edgetype(meta.inner_graph)
nv(meta::AbstractMetaGraph) = nv(meta.inner_graph)
vertices(meta::AbstractMetaGraph) = vertices(meta.inner_graph)

ne(meta::AbstractMetaGraph) = ne(meta.inner_graph)
edges(meta::AbstractMetaGraph) = edges(meta.inner_graph)

has_vertex(meta::AbstractMetaGraph, arguments...) =
    has_vertex(meta.inner_graph, arguments...)
@inline has_edge(meta::AbstractMetaGraph, arguments...) =
    has_edge(meta.inner_graph, arguments...)

inneighbors(meta::AbstractMetaGraph, vertex::Integer) =
    inneighbors(meta.inner_graph, vertex)
outneighbors(meta::AbstractMetaGraph, vertex::Integer) = fadj(meta.inner_graph, vertex)

issubset(meta::AbstractMetaGraph, meta2::AbstractMetaGraph) =
    issubset(meta.inner_graph, meta2.inner_graph)

@inline add_edge!(meta::AbstractMetaGraph, arguments...) =
    add_edge!(meta.inner_graph, arguments...)

function setindex!(meta::AbstractMetaGraph, value, edge::AbstractEdge)
    meta.edge_meta[maybe_order_edge(meta, edge)] = value
    add_edge!(meta, edge)
end

@inline function delete!(meta::AbstractMetaGraph, edge::Edge)
    delete!(meta.edge_meta, maybe_order_edge(meta, edge))
    rem_edge!(meta.inner_graph, edge)
end
@inline rem_edge!(meta::AbstractMetaGraph, edge::Edge) = delete!(meta, edge)

add_vertex!(meta::AbstractMetaGraph) = add_vertex!(meta.inner_graph)
function push!(meta::AbstractMetaGraph, value)
    add_vertex!(meta) || return false
    last_vertex = nv(meta)
    meta[last_vertex] = value
    return last_vertex
end

function move_meta!(meta, old_edge::AbstractEdge, new_edge::AbstractEdge)
    meta[new_edge] = pop!(meta.edge_meta, maybe_order_edge(meta, old_edge))
    return nothing
end

function delete!(meta::AbstractMetaGraph, deleted_vertex::Integer)
    moved_vertex = nv(meta)
    # delete meta data for the old vertex
    delete!(meta.vertex_meta, deleted_vertex)
    for out_neighbor in outneighbors(meta, deleted_vertex)
        delete!(meta, Edge(deleted_vertex, out_neighbor))
    end
    for in_neighbor in inneighbors(meta, deleted_vertex)
        delete!(meta, Edge(in_neighbor, deleted_vertex))
    end
    result =
        if deleted_vertex != moved_vertex
            # last vertex will move to the deleted vertex
            # move its meta data head of time
            if haskey(meta, moved_vertex)
                meta[deleted_vertex] = pop!(meta.vertex_meta, moved_vertex)
            end
            for out_neighbor in outneighbors(meta, moved_vertex)
                move_meta!(meta,
                    Edge(moved_vertex, out_neighbor),
                    Edge(deleted_vertex, out_neighbor)
                )
            end
            for in_neighbor in inneighbors(meta, moved_vertex)
                move_meta!(meta,
                    Edge(in_neighbor, moved_vertex),
                    Edge(in_neighbor, deleted_vertex)
                )
            end
            moved_vertex => deleted_vertex
        else
            nothing
        end
    rem_vertex!(meta.inner_graph, deleted_vertex)
    return result
end

rem_vertex!(meta::AbstractMetaGraph, vertex) = delete!(meta, vertex)

struct MetaWeights{Weight <: Real, InnerAbstractMetaGraph} <: AbstractMatrix{Weight}
    inner_meta_graph::InnerAbstractMetaGraph
end

show(io::IO, weights::MetaWeights) = print(io, "metaweights")
show(io::IO, ::MIME"text/plain", weights::MetaWeights) = show(io, weights)

MetaWeights(meta::AbstractMetaGraph) = MetaWeights{weight_type(meta), typeof(meta)}(meta)

function getindex(weights::MetaWeights{Weight}, in_vertex::Integer, out_vertex::Integer)::Weight where {Weight}
    edge = Edge(in_vertex, out_vertex)
    inner_meta_graph = weights.inner_meta_graph
    if haskey(inner_meta_graph, edge)
        Weight(inner_meta_graph.weight_function(inner_meta_graph[edge]))
    else
        inner_meta_graph.default_weight
    end
end

function size(weights::MetaWeights)
    vertices = nv(weights.inner_meta_graph)
    (vertices, vertices)
end

weights(meta::AbstractMetaGraph) = MetaWeights(meta)

weight_type(meta::AbstractMetaGraph{<: Any, <: Any, <: Any, <: Any, <: Any, <: Any, Weight}) where {Weight} =
    Weight

getindex(meta::AbstractMetaGraph, vertex::Integer) = meta.vertex_meta[vertex]
getindex(meta::AbstractMetaGraph, edge::AbstractEdge) = meta.edge_meta[edge]

haskey(meta::AbstractMetaGraph, vertex::Integer) = haskey(meta.vertex_meta, vertex)
haskey(meta::AbstractMetaGraph, edge::AbstractEdge) = haskey(meta.edge_meta, edge)

function setindex!(meta::AbstractMetaGraph, value, vertex::Integer)
    meta.vertex_meta[vertex] = value
    return nothing
end

"""
    weight_function(meta)

Return the  weight function for meta graph `meta`.

```jldoctest
julia> using MetaGraphs

julia> using LightGraphs: Graph

julia> weight_function(meta_graph(Graph(), weight_function = identity))(0)
0
```
"""
weight_function(meta::AbstractMetaGraph) = meta.weight_function

"""
    default_weight(meta)

Return the default weight for meta graph `meta`.

```jldoctest
julia> using MetaGraphs

julia> using LightGraphs: Graph

julia> default_weight(meta_graph(Graph(), default_weight = 2.0))
2.0
```
"""
default_weight(meta::AbstractMetaGraph) = meta.default_weight

"""
    filter_edges(meta, a_function)

Find edges for which `a_function` applied to the edge's metadata returns `true`.

```jldoctest
julia> using MetaGraphs

julia> using LightGraphs: Edge, Graph

julia> test = meta_graph(Graph(), AtEdge = Symbol);

julia> push!(test, nothing); push!(test, nothing); push!(test, nothing);

julia> test[Edge(1, 2)] = :a; test[Edge(2, 3)] = :b;

julia> filter_edges(test, isequal(:a))
1-element Array{LightGraphs.SimpleGraphs.SimpleEdge{Int64},1}:
 Edge 1 => 2
```
"""
filter_edges(meta::AbstractMetaGraph, a_function::Function) =
    findall(a_function, meta.edge_meta)

"""
    filter_vertices(meta, a_function)

Find vertices for which  `a_function` applied to the vertex's metadata returns
`true`.

```jldoctest
julia> using MetaGraphs

julia> using LightGraphs: Graph

julia> test = meta_graph(Graph(), AtVertex = Symbol);

julia> push!(test, :a); push!(test, :b);

julia> filter_vertices(test, isequal(:a))
1-element Array{Int64,1}:
 1
```
"""
filter_vertices(meta::AbstractMetaGraph, a_function::Function) =
    findall(a_function, meta.vertex_meta)

function copy_meta!(old_meta, new_meta, vertex_map)
    for (new_vertex, old_vertex) in enumerate(vertex_map)
        if haskey(old_meta, old_vertex)
            new_meta[new_vertex] = old_meta[old_vertex]
        end
    end
    for new_edge in edges(new_meta)
        in_vertex, out_vertex = Tuple(new_edge)
        old_edge = Edge(vertex_map[in_vertex], vertex_map[out_vertex])
        if haskey(old_meta, old_edge)
            new_meta[new_edge] = old_meta[old_edge]
        end
    end
    return nothing
end

function induced_subgraph(meta::AbstractMetaGraph{Vertex}, vertices::AbstractVector{Vertex}) where {Vertex <: Integer}
    induced_graph, vertex_map =
        induced_subgraph(meta.inner_graph, vertices)
    induced_meta =
        typeof(meta)(induced_graph,
            empty(meta.vertex_meta),
            empty(meta.edge_meta),
            meta.graph_meta,
            meta.weight_function,
            meta.default_weight
        )
    copy_meta!(meta, induced_meta, vertex_map)
    return induced_meta
end

# TODO - would be nice to be able to apply a function to properties. Not sure
# how this might work, but if the property is a vector, a generic way to append to
# it would be a good thing.

==(meta::AbstractMetaGraph, meta2::AbstractMetaGraph) = meta.inner_graph == meta2.inner_graph

copy(meta::AbstractMetaGraph) = deepcopy(meta)

zero(meta::AbstractMetaGraph{<:Any, InnerGraph, AtVertex, AtEdge, GraphMeta}) where {InnerGraph, AtVertex, AtEdge, GraphMeta} =
    meta_graph(InnerGraph();
        AtVertex = AtVertex,
        AtEdge = AtEdge,
        graph_meta = GraphMeta(),
        weight_function = meta.weight_function,
        default_weight = meta.default_weight
    )

include("metadigraph.jl")
include("metagraph.jl")
include("overrides.jl")
include("persistence.jl")

end # module
